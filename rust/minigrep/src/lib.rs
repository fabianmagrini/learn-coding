use std::error::Error;
use std::fs;
use std::io::{IsTerminal, Read};
use std::path::Path;

use clap::Parser;
use glob::Pattern;

// ANSI escape sequences for colouring terminal output. `\x1b[` starts a control
// sequence, the number picks the style (e.g. `1;31` = bold red, `35` = magenta,
// `32` = green), and `m` ends it. `RESET` (`0`) clears styling back to normal;
// every colour we open must be closed with it. Consts can build on each other,
// so `HIGHLIGHT_END` is just an alias for `RESET`.
const RESET: &str = "\x1b[0m";
const HIGHLIGHT_START: &str = "\x1b[1;31m"; // bold red — the matched substring
const HIGHLIGHT_END: &str = RESET;
const FILE_COLOR: &str = "\x1b[35m"; // magenta — file-name prefix
const LINE_COLOR: &str = "\x1b[32m"; // green — line-number prefix

// Holds the parsed command-line configuration.
//
// Deriving `clap::Parser` turns this struct *into* the CLI: each field becomes
// an argument, the `///` doc comments below become the `--help` text, and clap
// generates the parser, usage errors, `--help`/`--version`, and exit codes for
// us. This replaces the hand-rolled `args` indexing we started with — clap is
// how real Rust CLIs parse input. (Note: these `//` comments stay internal;
// only `///` doc comments show up in `--help`.)
#[derive(Parser)]
#[command(name = "minigrep", version, about = "A tiny grep clone written in Rust")]
pub struct Config {
    /// The string to search for
    pub query: String,

    /// File or directory to search. A directory is searched recursively for
    /// `.txt` files. Reads from standard input when omitted, so you can pipe
    /// text in: `cat poem.txt | minigrep who`.
    //
    // Making the field `Option<String>` tells clap this positional is optional.
    // `None` means "no path was given" — our cue to read from stdin instead.
    pub file_path: Option<String>,

    /// Search case-insensitively (also enabled by setting IGNORE_CASE=true)
    //
    // `-i`/`--ignore-case` is a pure on/off flag: writing `-i` sets it to true
    // and it takes no value, so `minigrep -i who poem.txt` reads naturally.
    // `env = "IGNORE_CASE"` lets clap also flip it from the environment; because
    // the field is a plain `bool`, the env var must be `true` or `false`.
    #[arg(short, long, env = "IGNORE_CASE")]
    pub ignore_case: bool,

    /// Prefix each match with its 1-based line number
    #[arg(short = 'n', long)]
    pub line_number: bool,

    /// Print only a count of matching lines per source, not the lines themselves
    #[arg(short, long)]
    pub count: bool,

    /// Only search files whose name matches this glob (repeatable) when the path
    /// is a directory; defaults to `*.txt`. E.g. `--include='*.rs' --include='*.md'`
    //
    // A `Vec<String>` field lets clap collect a repeated option into a list, so
    // passing `--include` more than once accumulates patterns instead of
    // overwriting. `value_name` sets the placeholder shown in `--help`.
    #[arg(long, value_name = "GLOB")]
    pub include: Vec<String>,

    /// Skip files whose name matches this glob (repeatable) when the path is a
    /// directory. Exclusions win over `--include`. E.g. `--exclude='*_test.txt'`
    #[arg(long, value_name = "GLOB")]
    pub exclude: Vec<String>,
}

/// Runs the search and prints matching lines.
///
/// Returns a boxed trait object error (`Box<dyn Error>`) so any error type that
/// implements `Error` — like the one from `fs::read_to_string` — can bubble up
/// through the `?` operator.
pub fn run(config: Config) -> Result<(), Box<dyn Error>> {
    // Gather everything to search: one source for stdin/a single file, or many
    // sources when the path is a directory. The `?` propagates any read error.
    let sources = collect_sources(config.file_path.as_deref(), &config.include, &config.exclude)?;

    // Only emit colour codes when writing to a real terminal. If the output is
    // piped into another program or redirected to a file, `is_terminal()` is
    // false and we print plain text so the escape sequences don't pollute it.
    let colorize = std::io::stdout().is_terminal();

    for source in &sources {
        let results = if config.ignore_case {
            search_case_insensitive(&config.query, &source.contents)
        } else {
            search(&config.query, &source.contents)
        };

        // In count mode we report just how many lines matched (per source, so a
        // directory search prints one count per file, zeros included) and skip
        // printing the lines themselves — line numbers and highlighting too.
        if config.count {
            println!(
                "{}",
                format_count(source.name.as_deref(), results.len(), colorize)
            );
            continue;
        }

        // Destructure each `(number, line)` tuple right in the `for` pattern.
        for (number, line) in results {
            let text = if colorize {
                highlight(line, &config.query, config.ignore_case)
            } else {
                line.to_string()
            };

            println!(
                "{}",
                format_match(
                    source.name.as_deref(),
                    number,
                    config.line_number,
                    &text,
                    colorize
                )
            );
        }
    }

    Ok(())
}

/// One unit of text to search, plus an optional display name used as an output
/// prefix. `name` is `Some(path)` when searching a directory (so results say
/// which file matched, like `grep -r`) and `None` for stdin or a single file.
struct Source {
    name: Option<String>,
    contents: String,
}

/// Builds the list of sources to search from the given path:
/// - `None` → read standard input as a single, unnamed source.
/// - a file → read it as a single, unnamed source (no filename prefix).
/// - a directory → recursively collect files whose name matches one of the
///   `include` globs (defaulting to `*.txt`) and none of the `exclude` globs,
///   each named by path.
fn collect_sources(
    path: Option<&str>,
    include: &[String],
    exclude: &[String],
) -> Result<Vec<Source>, Box<dyn Error>> {
    match path {
        None => {
            let mut buffer = String::new();
            // `read_to_string` comes from the `Read` trait; it fills `buffer`
            // with everything piped into the program until end-of-input.
            std::io::stdin().read_to_string(&mut buffer)?;
            Ok(vec![Source {
                name: None,
                contents: buffer,
            }])
        }
        Some(path) => {
            if fs::metadata(path)?.is_dir() {
                // Compile the include globs once, up front. With none supplied we
                // fall back to `*.txt`. `collect::<Result<_, _>>()` turns an
                // iterator of `Result`s into one `Result`, so a bad pattern (e.g.
                // an unbalanced `[`) surfaces here via `?`.
                let includes: Vec<Pattern> = if include.is_empty() {
                    vec![Pattern::new("*.txt").expect("built-in default glob is valid")]
                } else {
                    include
                        .iter()
                        .map(|glob| Pattern::new(glob))
                        .collect::<Result<_, _>>()?
                };

                // Exclusions have no default — an empty list excludes nothing.
                let excludes: Vec<Pattern> = exclude
                    .iter()
                    .map(|glob| Pattern::new(glob))
                    .collect::<Result<_, _>>()?;

                let mut sources = Vec::new();
                collect_matching_files(Path::new(path), &includes, &excludes, &mut sources)?;
                // Sort by path so output order is stable across runs (directory
                // iteration order is otherwise unspecified by the OS).
                sources.sort_by(|a, b| a.name.cmp(&b.name));
                Ok(sources)
            } else {
                Ok(vec![Source {
                    name: None,
                    contents: fs::read_to_string(path)?,
                }])
            }
        }
    }
}

/// Recursively walks `dir`, pushing a [`Source`] for every file whose name
/// matches one of `includes` and none of `excludes` into `out`. Recursion
/// mirrors the directory tree; each nested folder is visited by calling this
/// function again.
///
/// (For simplicity this follows symlinks and does not guard against symlink
/// cycles — fine for a learning demo, but something a real tool would handle.)
fn collect_matching_files(
    dir: &Path,
    includes: &[Pattern],
    excludes: &[Pattern],
    out: &mut Vec<Source>,
) -> Result<(), Box<dyn Error>> {
    for entry in fs::read_dir(dir)? {
        let path = entry?.path();
        if path.is_dir() {
            collect_matching_files(&path, includes, excludes, out)?;
        } else if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            // Glob matching is done on the file name alone (not the full path),
            // so `*.rs` matches `src/lib.rs` by its `lib.rs` component. A file is
            // kept only when it matches an include and no exclude — exclusions
            // take precedence, mirroring `grep`.
            let included = includes.iter().any(|pattern| pattern.matches(name));
            let excluded = excludes.iter().any(|pattern| pattern.matches(name));
            if included && !excluded {
                out.push(Source {
                    name: Some(path.display().to_string()),
                    contents: fs::read_to_string(&path)?,
                });
            }
        }
    }
    Ok(())
}

/// Wraps `s` in the ANSI `color` when `colorize` is true, otherwise returns it
/// unchanged. Centralising the colour-vs-plain choice keeps the callers tidy.
fn paint(colorize: bool, color: &str, s: &str) -> String {
    if colorize {
        format!("{color}{s}{RESET}")
    } else {
        s.to_string()
    }
}

/// Formats one match line for output: an optional `name:` prefix (when
/// searching a directory, in magenta), an optional `number: ` prefix (with
/// `-n`, in green), then the matched text. `colorize` mirrors whether stdout is
/// a terminal. Keeping this pure makes the output format easy to unit-test.
fn format_match(
    name: Option<&str>,
    number: usize,
    show_number: bool,
    text: &str,
    colorize: bool,
) -> String {
    let mut out = String::new();
    if let Some(name) = name {
        out.push_str(&paint(colorize, FILE_COLOR, name));
        out.push(':');
    }
    if show_number {
        out.push_str(&paint(colorize, LINE_COLOR, &number.to_string()));
        out.push_str(": ");
    }
    out.push_str(text);
    out
}

/// Formats a count line for `--count` mode: `name:count` when searching a
/// directory (so each file's tally is labelled, with the name in magenta when
/// colourised), or just the number otherwise.
fn format_count(name: Option<&str>, count: usize, colorize: bool) -> String {
    match name {
        Some(name) => format!("{}:{count}", paint(colorize, FILE_COLOR, name)),
        None => count.to_string(),
    }
}

/// Wraps every occurrence of `query` inside `line` with ANSI highlight codes,
/// returning a new `String`. When `ignore_case` is set, matching is
/// case-insensitive but the highlighted text keeps the line's original casing.
///
/// Returns the line unchanged when the query is empty or has no matches.
pub fn highlight(line: &str, query: &str, ignore_case: bool) -> String {
    if query.is_empty() {
        return line.to_string();
    }

    // We search within a possibly-lowercased copy but always slice the ORIGINAL
    // `line`, so the printed match preserves its real casing. This index mapping
    // assumes lowercasing doesn't shift byte positions, which holds for ASCII —
    // fine for a learning demo; a production tool would handle Unicode widths.
    let haystack = if ignore_case {
        line.to_lowercase()
    } else {
        line.to_string()
    };
    let needle = if ignore_case {
        query.to_lowercase()
    } else {
        query.to_string()
    };

    let mut result = String::with_capacity(line.len());
    let mut last = 0;

    // `match_indices` yields the byte offset and text of each non-overlapping
    // match, letting us stitch together "before + highlighted + after" segments.
    for (start, matched) in haystack.match_indices(&needle) {
        let end = start + matched.len();
        result.push_str(&line[last..start]);
        result.push_str(HIGHLIGHT_START);
        result.push_str(&line[start..end]);
        result.push_str(HIGHLIGHT_END);
        last = end;
    }
    result.push_str(&line[last..]);
    result
}

/// Returns every line in `contents` that contains `query`, paired with its
/// 1-based line number.
///
/// The returned slices borrow from `contents`, so the lifetime `'a` ties the
/// output to the input — the borrow checker guarantees we never return
/// references into freed memory. `enumerate` yields 0-based indices, so we add
/// 1 to match the numbering people expect from editors and `grep -n`.
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<(usize, &'a str)> {
    contents
        .lines()
        .enumerate()
        .filter(|(_, line)| line.contains(query))
        .map(|(i, line)| (i + 1, line))
        .collect()
}

/// Case-insensitive variant of [`search`].
pub fn search_case_insensitive<'a>(query: &str, contents: &'a str) -> Vec<(usize, &'a str)> {
    let query = query.to_lowercase();

    contents
        .lines()
        .enumerate()
        .filter(|(_, line)| line.to_lowercase().contains(&query))
        .map(|(i, line)| (i + 1, line))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    // clap's derive macro can produce a subtly invalid CLI; `debug_assert`
    // catches those mistakes at test time. This is the recommended smoke test.
    #[test]
    fn cli_definition_is_valid() {
        use clap::CommandFactory;
        Config::command().debug_assert();
    }

    #[test]
    fn parses_positional_args() {
        // `try_parse_from` lets us feed argv in a test without touching the real
        // process arguments. Note argv[0] is the program name, as in a real run.
        let config = Config::try_parse_from(["minigrep", "query", "file.txt"]).unwrap();
        assert_eq!(config.query, "query");
        assert_eq!(config.file_path.as_deref(), Some("file.txt"));
        assert!(!config.ignore_case);
    }

    #[test]
    fn file_path_is_optional() {
        // No file path — the field is `None`, which `run` treats as "read stdin".
        let config = Config::try_parse_from(["minigrep", "query"]).unwrap();
        assert_eq!(config.query, "query");
        assert_eq!(config.file_path, None);
    }

    #[test]
    fn ignore_case_flag_sets_true() {
        let config =
            Config::try_parse_from(["minigrep", "-i", "query", "file.txt"]).unwrap();
        assert!(config.ignore_case);
    }

    #[test]
    fn line_number_flag_sets_true() {
        let config =
            Config::try_parse_from(["minigrep", "-n", "query", "file.txt"]).unwrap();
        assert!(config.line_number);
    }

    #[test]
    fn count_flag_sets_true() {
        let config =
            Config::try_parse_from(["minigrep", "-c", "query", "file.txt"]).unwrap();
        assert!(config.count);
    }

    #[test]
    fn missing_query_is_an_error() {
        // `query` is required, so no positionals at all is a usage error that
        // clap reports itself. (A lone `query` is now valid — it reads stdin.)
        assert!(Config::try_parse_from(["minigrep"]).is_err());
    }

    #[test]
    fn include_flag_collects_repeated_values() {
        let config = Config::try_parse_from([
            "minigrep",
            "--include=*.rs",
            "--include=*.md",
            "query",
            "some_dir",
        ])
        .unwrap();
        assert_eq!(config.include, vec!["*.rs", "*.md"]);
    }

    #[test]
    fn exclude_flag_collects_repeated_values() {
        let config = Config::try_parse_from([
            "minigrep",
            "--exclude=*_test.txt",
            "--exclude=*.min.js",
            "query",
            "some_dir",
        ])
        .unwrap();
        assert_eq!(config.exclude, vec!["*_test.txt", "*.min.js"]);
    }

    #[test]
    fn case_sensitive() {
        let query = "duct";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.
Duct tape.";

        // "productive." is on line 2, so we expect the pair (2, ...).
        assert_eq!(vec![(2, "safe, fast, productive.")], search(query, contents));
    }

    #[test]
    fn case_insensitive() {
        let query = "rUsT";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.
Trust me.";

        // Matches on lines 1 ("Rust:") and 4 ("Trust me."); numbers are 1-based.
        assert_eq!(
            vec![(1, "Rust:"), (4, "Trust me.")],
            search_case_insensitive(query, contents)
        );
    }

    #[test]
    fn no_matches_returns_empty() {
        let query = "monomorphization";
        let contents = "just some plain text";
        assert!(search(query, contents).is_empty());
    }

    #[test]
    fn highlight_wraps_a_match() {
        assert_eq!(
            highlight("productive", "duct", false),
            format!("pro{HIGHLIGHT_START}duct{HIGHLIGHT_END}ive")
        );
    }

    #[test]
    fn highlight_keeps_original_casing_when_case_insensitive() {
        // Query "rust" matches "Rust"; the highlighted text stays "Rust".
        assert_eq!(
            highlight("Rust rules", "rust", true),
            format!("{HIGHLIGHT_START}Rust{HIGHLIGHT_END} rules")
        );
    }

    #[test]
    fn highlight_marks_every_occurrence() {
        assert_eq!(
            highlight("na na na", "na", false),
            format!(
                "{h}na{e} {h}na{e} {h}na{e}",
                h = HIGHLIGHT_START,
                e = HIGHLIGHT_END
            )
        );
    }

    #[test]
    fn highlight_without_a_match_is_unchanged() {
        assert_eq!(highlight("hello world", "xyz", false), "hello world");
    }

    #[test]
    fn highlight_with_empty_query_is_unchanged() {
        assert_eq!(highlight("hello world", "", false), "hello world");
    }

    #[test]
    fn format_match_plain_is_just_the_text() {
        assert_eq!(format_match(None, 3, false, "hello", false), "hello");
    }

    #[test]
    fn format_match_with_line_number() {
        assert_eq!(format_match(None, 3, true, "hello", false), "3: hello");
    }

    #[test]
    fn format_match_with_file_name() {
        assert_eq!(
            format_match(Some("a.txt"), 3, false, "hello", false),
            "a.txt:hello"
        );
    }

    #[test]
    fn format_match_with_name_and_number() {
        assert_eq!(
            format_match(Some("a.txt"), 3, true, "hello", false),
            "a.txt:3: hello"
        );
    }

    #[test]
    fn format_match_colorizes_name_and_number() {
        // Name in magenta, line number in green, each closed with a reset. The
        // matched text is coloured separately by `highlight`, so it stays plain.
        assert_eq!(
            format_match(Some("a.txt"), 3, true, "hello", true),
            format!("{FILE_COLOR}a.txt{RESET}:{LINE_COLOR}3{RESET}: hello")
        );
    }

    #[test]
    fn format_count_plain_is_just_the_number() {
        assert_eq!(format_count(None, 3, false), "3");
    }

    #[test]
    fn format_count_with_name_labels_the_file() {
        assert_eq!(format_count(Some("a.txt"), 0, false), "a.txt:0");
    }

    #[test]
    fn format_count_colorizes_the_file_name() {
        assert_eq!(
            format_count(Some("a.txt"), 2, true),
            format!("{FILE_COLOR}a.txt{RESET}:2")
        );
    }

    // Creates a fresh, uniquely-named directory under the system temp dir so
    // parallel test runs never collide.
    fn unique_temp_dir() -> std::path::PathBuf {
        use std::time::{SystemTime, UNIX_EPOCH};
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir()
            .join(format!("minigrep-test-{}-{}", std::process::id(), nanos));
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn collect_sources_recurses_txt_files_by_default() {
        let root = unique_temp_dir();
        let sub = root.join("nested");
        std::fs::create_dir_all(&sub).unwrap();
        std::fs::write(root.join("a.txt"), "alpha\n").unwrap();
        std::fs::write(root.join("skip.md"), "ignored\n").unwrap();
        std::fs::write(sub.join("b.txt"), "bravo\n").unwrap();

        // Empty `include` means "use the default glob", which is `*.txt`.
        let sources = collect_sources(Some(root.to_str().unwrap()), &[], &[]).unwrap();
        let names: Vec<String> = sources.iter().filter_map(|s| s.name.clone()).collect();

        // Two `.txt` files (one nested); the `.md` file is excluded.
        assert_eq!(names.len(), 2);
        assert!(names.iter().any(|n| n.ends_with("a.txt")));
        assert!(names.iter().any(|n| n.ends_with("b.txt")));
        assert!(names.iter().all(|n| !n.ends_with("skip.md")));

        std::fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn collect_sources_honours_include_globs() {
        let root = unique_temp_dir();
        std::fs::write(root.join("a.txt"), "alpha\n").unwrap();
        std::fs::write(root.join("b.md"), "bravo\n").unwrap();
        std::fs::write(root.join("c.log"), "charlie\n").unwrap();

        // Include only `.md` and `.log`; `.txt` should now be skipped.
        let include = vec!["*.md".to_string(), "*.log".to_string()];
        let sources = collect_sources(Some(root.to_str().unwrap()), &include, &[]).unwrap();
        let names: Vec<String> = sources.iter().filter_map(|s| s.name.clone()).collect();

        assert_eq!(names.len(), 2);
        assert!(names.iter().any(|n| n.ends_with("b.md")));
        assert!(names.iter().any(|n| n.ends_with("c.log")));
        assert!(names.iter().all(|n| !n.ends_with("a.txt")));

        std::fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn collect_sources_rejects_an_invalid_glob() {
        let root = unique_temp_dir();
        // `[` opens a character class that is never closed — an invalid pattern.
        let include = vec!["*.[".to_string()];
        assert!(collect_sources(Some(root.to_str().unwrap()), &include, &[]).is_err());
        std::fs::remove_dir_all(&root).unwrap();
    }

    #[test]
    fn collect_sources_applies_exclude_globs() {
        let root = unique_temp_dir();
        std::fs::write(root.join("keep.txt"), "a\n").unwrap();
        std::fs::write(root.join("notes_test.txt"), "b\n").unwrap();

        // Default include (`*.txt`) picks up both, but the exclude drops the
        // `*_test.txt` file — exclusions take precedence over includes.
        let exclude = vec!["*_test.txt".to_string()];
        let sources = collect_sources(Some(root.to_str().unwrap()), &[], &exclude).unwrap();
        let names: Vec<String> = sources.iter().filter_map(|s| s.name.clone()).collect();

        assert_eq!(names.len(), 1);
        assert!(names[0].ends_with("keep.txt"));

        std::fs::remove_dir_all(&root).unwrap();
    }
}
