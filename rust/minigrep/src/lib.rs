use std::error::Error;
use std::fs;

use clap::Parser;

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

    /// Path to the file to search
    pub file_path: String,

    /// Search case-insensitively (also enabled by setting IGNORE_CASE=true)
    //
    // `-i`/`--ignore-case` is a pure on/off flag: writing `-i` sets it to true
    // and it takes no value, so `minigrep -i who poem.txt` reads naturally.
    // `env = "IGNORE_CASE"` lets clap also flip it from the environment; because
    // the field is a plain `bool`, the env var must be `true` or `false`.
    #[arg(short, long, env = "IGNORE_CASE")]
    pub ignore_case: bool,
}

/// Runs the search and prints matching lines.
///
/// Returns a boxed trait object error (`Box<dyn Error>`) so any error type that
/// implements `Error` — like the one from `fs::read_to_string` — can bubble up
/// through the `?` operator.
pub fn run(config: Config) -> Result<(), Box<dyn Error>> {
    // The `?` propagates a file-read error up to the caller instead of panicking.
    let contents = fs::read_to_string(&config.file_path)?;

    let results = if config.ignore_case {
        search_case_insensitive(&config.query, &contents)
    } else {
        search(&config.query, &contents)
    };

    for line in results {
        println!("{line}");
    }

    Ok(())
}

/// Returns every line in `contents` that contains `query`.
///
/// The returned slices borrow from `contents`, so the lifetime `'a` ties the
/// output to the input — the borrow checker guarantees we never return
/// references into freed memory.
pub fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    contents
        .lines()
        .filter(|line| line.contains(query))
        .collect()
}

/// Case-insensitive variant of [`search`].
pub fn search_case_insensitive<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let query = query.to_lowercase();

    contents
        .lines()
        .filter(|line| line.to_lowercase().contains(&query))
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
        assert_eq!(config.file_path, "file.txt");
        assert!(!config.ignore_case);
    }

    #[test]
    fn ignore_case_flag_sets_true() {
        let config =
            Config::try_parse_from(["minigrep", "-i", "query", "file.txt"]).unwrap();
        assert!(config.ignore_case);
    }

    #[test]
    fn missing_file_path_is_an_error() {
        // Only one positional given — clap reports the missing argument itself.
        assert!(Config::try_parse_from(["minigrep", "query"]).is_err());
    }

    #[test]
    fn case_sensitive() {
        let query = "duct";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.
Duct tape.";

        assert_eq!(vec!["safe, fast, productive."], search(query, contents));
    }

    #[test]
    fn case_insensitive() {
        let query = "rUsT";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.
Trust me.";

        assert_eq!(
            vec!["Rust:", "Trust me."],
            search_case_insensitive(query, contents)
        );
    }

    #[test]
    fn no_matches_returns_empty() {
        let query = "monomorphization";
        let contents = "just some plain text";
        assert!(search(query, contents).is_empty());
    }
}
