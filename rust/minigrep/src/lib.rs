use std::error::Error;
use std::fs;
use std::io::{IsTerminal, Read};

use clap::Parser;

// ANSI escape sequences used to highlight matches in terminal output.
// `\x1b[` starts a control sequence; `1;31` means "bold; red foreground"; `m`
// ends it. `0` resets all styling back to normal.
const HIGHLIGHT_START: &str = "\x1b[1;31m";
const HIGHLIGHT_END: &str = "\x1b[0m";

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

    /// Path to the file to search. Reads from standard input when omitted,
    /// so you can pipe text in: `cat poem.txt | minigrep who`.
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
}

/// Runs the search and prints matching lines.
///
/// Returns a boxed trait object error (`Box<dyn Error>`) so any error type that
/// implements `Error` — like the one from `fs::read_to_string` — can bubble up
/// through the `?` operator.
pub fn run(config: Config) -> Result<(), Box<dyn Error>> {
    // `as_deref` turns `Option<String>` into `Option<&str>` without cloning, so
    // `read_input` can borrow the path. The `?` propagates any read error up.
    let contents = read_input(config.file_path.as_deref())?;

    let results = if config.ignore_case {
        search_case_insensitive(&config.query, &contents)
    } else {
        search(&config.query, &contents)
    };

    // Only emit colour codes when writing to a real terminal. If the output is
    // piped into another program or redirected to a file, `is_terminal()` is
    // false and we print plain text so the escape sequences don't pollute it.
    let colorize = std::io::stdout().is_terminal();

    // Destructure each `(number, line)` tuple right in the `for` pattern.
    for (number, line) in results {
        let text = if colorize {
            highlight(line, &config.query, config.ignore_case)
        } else {
            line.to_string()
        };

        if config.line_number {
            println!("{number}: {text}");
        } else {
            println!("{text}");
        }
    }

    Ok(())
}

/// Reads the entire search input: from the file at `path` when given, or from
/// standard input when `path` is `None`. Reading stdin is what lets you pipe
/// text in — `cat poem.txt | minigrep who` — instead of naming a file.
fn read_input(path: Option<&str>) -> Result<String, Box<dyn Error>> {
    // `match` on the `Option` makes the two input sources explicit and forces us
    // to handle both — the compiler won't let us forget the `None` arm.
    match path {
        Some(path) => Ok(fs::read_to_string(path)?),
        None => {
            let mut buffer = String::new();
            // `read_to_string` comes from the `Read` trait; it fills `buffer`
            // with everything piped into the program until end-of-input.
            std::io::stdin().read_to_string(&mut buffer)?;
            Ok(buffer)
        }
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
    fn missing_query_is_an_error() {
        // `query` is required, so no positionals at all is a usage error that
        // clap reports itself. (A lone `query` is now valid — it reads stdin.)
        assert!(Config::try_parse_from(["minigrep"]).is_err());
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
}
