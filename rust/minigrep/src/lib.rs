use std::env;
use std::error::Error;
use std::fs;

/// Holds the parsed command-line configuration.
///
/// `query` is what we search for, `file_path` is where we search, and
/// `ignore_case` is toggled by the `IGNORE_CASE` environment variable.
pub struct Config {
    pub query: String,
    pub file_path: String,
    pub ignore_case: bool,
}

impl Config {
    /// Builds a `Config` from the raw arguments.
    ///
    /// Returns `Err(&'static str)` instead of panicking so `main` can print a
    /// friendly message and exit cleanly. This is the idiomatic Rust way to
    /// surface recoverable errors.
    pub fn build(args: &[String]) -> Result<Config, &'static str> {
        if args.len() < 3 {
            return Err("not enough arguments");
        }

        // `clone` keeps things simple: `Config` owns its strings rather than
        // borrowing from `args`, which avoids lifetime plumbing while learning.
        let query = args[1].clone();
        let file_path = args[2].clone();

        // Case-insensitive search is opt-in via an env var. `is_ok()` is true
        // whenever the variable is set (to any value).
        let ignore_case = env::var("IGNORE_CASE").is_ok();

        Ok(Config {
            query,
            file_path,
            ignore_case,
        })
    }
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

    #[test]
    fn build_fails_with_too_few_args() {
        let args = vec![String::from("minigrep")];
        assert!(Config::build(&args).is_err());
    }

    #[test]
    fn build_succeeds_with_enough_args() {
        let args = vec![
            String::from("minigrep"),
            String::from("query"),
            String::from("file.txt"),
        ];
        let config = Config::build(&args).unwrap();
        assert_eq!(config.query, "query");
        assert_eq!(config.file_path, "file.txt");
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
