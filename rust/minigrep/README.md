# minigrep

A small `grep` clone in Rust — the canonical "first real Rust project," grown into a
capable little search tool. It started as a ~20-line file reader and now searches files,
directories, and standard input with the kind of ergonomics you'd expect from `grep`
itself. Small enough to read in one sitting, it exercises the concepts that make Rust
*Rust*.

## Features

- **Search** a file, a directory (recursively), or standard input (`cat file | minigrep …`).
- **Case-insensitive** matching with `-i`/`--ignore-case` (or `IGNORE_CASE=true`).
- **Line numbers** with `-n`/`--line-number`.
- **Count mode** with `-c`/`--count` — matches per source, like `grep -c`.
- **Directory filters** `--include=GLOB` (defaults to `*.txt`) and `--exclude=GLOB`, both repeatable; exclusions win.
- **`grep`-style colour** — red matches, magenta file names, green line numbers — with a `--color=auto|always|never` override.
- **Auto-generated `--help`/`--version`** and clean, friendly error messages.

## What this demo teaches

| Concept | Where to look |
| --- | --- |
| **Ownership & borrowing** | `search` returns borrowed slices (`&'a str`) tied to the file contents by the lifetime `'a`, so matching copies no text |
| **`Result` & the `?` operator** | `run` in `src/lib.rs` returns `Result` and uses `?` to propagate file-read errors |
| **Structs & derive macros** | `Config` derives `clap::Parser`, turning the struct into the CLI definition |
| **CLI parsing with a crate** | `clap` provides argument parsing, `--help`/`--version`, and error handling — see `Config` in `src/lib.rs` |
| **Iterators & closures** | `.lines().enumerate().filter(...).map(...).collect()` is idiomatic iterator style |
| **Tuples & destructuring** | `search` returns `Vec<(usize, &str)>`; `run` unpacks `(number, line)` in the `for` pattern |
| **`Option` & `match`** | `file_path: Option<String>`; `collect_sources` matches `Some(path)` vs `None` (stdin) |
| **Traits (`Read`)** | `collect_sources` reads stdin via `std::io::stdin().read_to_string(...)` |
| **Recursion & the filesystem** | `collect_matching_files` walks a directory tree with `fs::read_dir`, recursing into subfolders |
| **Using a crate + `collect` into `Result`** | `--include` globs are compiled with the `glob` crate; a bad pattern surfaces via `collect::<Result<_, _>>()?` |
| **`Path` & structs** | `Source { name, contents }` pairs each file's text with its path for `grep -r`-style output |
| **String building & slicing** | `highlight` uses `match_indices` + byte-range slices to wrap matches |
| **ANSI colour** | matches (red), file names (magenta), and line numbers (green) via the `paint` helper |
| **Enums & `ValueEnum`** | `--color=auto\|always\|never` is a `ColorChoice` enum clap validates and lists in `--help` |
| **TTY detection** | with `--color=auto` (default), `run` colours only when stdout `is_terminal()`, staying plain when piped |
| **Pattern matching / `if let`** | `main.rs` handles the run error with `if let Err(e)` |
| **Environment variables** | `IGNORE_CASE=true` toggles case-insensitive search (wired up by clap's `env`) |
| **Unit testing** | `#[cfg(test)] mod tests` at the bottom of `src/lib.rs`, including clap-parsing and highlight tests |
| **lib + bin split** | Logic lives in `src/lib.rs` (testable); `src/main.rs` is a thin wrapper |

## Prerequisites

Install the Rust toolchain (includes `cargo`, the build tool and package manager):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# then restart your shell, or:
source "$HOME/.cargo/env"
```

Verify: `cargo --version`

## Run it

```bash
cd rust/minigrep

# See the auto-generated help (clap builds this from the struct + doc comments):
cargo run -- --help

# Case-sensitive search — the poem capitalises "Who", so lowercase "who"
# matches nothing here. Try "nobody" to see a hit:
cargo run -- nobody poem.txt

# Case-insensitive search via the -i / --ignore-case flag — now "who" matches "Who":
cargo run -- -i who poem.txt

# The same toggle is also available as an environment variable:
IGNORE_CASE=true cargo run -- who poem.txt

# Omit the file path to read from standard input — pipe text in:
cat poem.txt | cargo run -- -i who

# Show 1-based line numbers with -n / --line-number (combine flags, e.g. -ni):
cargo run -- -n nobody poem.txt

# Pass a directory to search every .txt file under it recursively; matches are
# prefixed with the file path (like `grep -r`):
cargo run -- -n fox some/directory

# Print only a count of matching lines with -c / --count (per file in a
# directory, like `grep -c`):
cargo run -- -c nobody poem.txt
cargo run -- -c fox some/directory

# Choose which files a directory search reads with --include=GLOB (defaults to
# *.txt; repeatable). Matches on the file name, so `*.rs` matches src/lib.rs:
cargo run -- --include='*.rs' --include='*.md' fn some/directory

# Skip files with --exclude=GLOB (repeatable). Exclusions win over --include:
cargo run -- --exclude='*_test.txt' fox some/directory

# Force or disable colour regardless of whether output is a terminal:
cargo run -- --color=always nobody poem.txt | cat   # keeps colour through the pipe
cargo run -- --color=never nobody poem.txt          # plain, even in a terminal
```

The `--` separates cargo's own flags from arguments passed to *your* program.

When you run in a terminal, output is colourised like `grep`: the **match** in bold red,
the **file name** in magenta, and the **line number** in green. Pipe the output somewhere
(e.g. `| cat`, `> out.txt`) and all colouring is automatically dropped so the escape
codes don't end up in your file. Override this with `--color=always` (force colour, even
when piped) or `--color=never` (force plain); the default is `--color=auto`.

Expected output:

```
$ cargo run -- nobody poem.txt
I'm nobody! Who are you?
Are you nobody, too?

$ cargo run -- -i who poem.txt
I'm nobody! Who are you?

$ cargo run -- -n nobody poem.txt
1: I'm nobody! Who are you?
2: Are you nobody, too?

$ cargo run -- -n fox some/directory
some/directory/one.txt:1: the quick brown fox
some/directory/sub/two.txt:1: another fox appears

$ cargo run -- -c fox some/directory
some/directory/empty.txt:0
some/directory/one.txt:2
some/directory/sub/two.txt:1
```

## Test it

```bash
cargo test
```

Thirty-two tests cover four areas:

- **Argument parsing** — every flag, the optional file path, invalid values, and a `debug_assert` smoke test of the CLI definition.
- **Search** — case-sensitive and case-insensitive matching with 1-based line numbers, plus the empty-result case.
- **Output formatting** — file-name and line-number prefixes, ANSI highlighting, and count mode, in both plain and colourised forms.
- **Directory collection** — recursion over a real temp directory with the default glob, custom `--include`/`--exclude` globs, and rejection of an invalid pattern.

## Ideas to keep learning

This project began as the five exercises from [the Rust Book's I/O
chapter](https://doc.rust-lang.org/book/ch12-00-an-io-project.html) — clap parsing, match
highlighting, stdin, line numbers, and directory recursion — and grew from there. Good
next steps:

- **Invert match** (`-v`) — print the lines that *don't* match.
- **Context lines** (`-C N`) — print N lines around each match.
- **Swap the hand-rolled recursion** for the [`walkdir`](https://crates.io/crates/walkdir) crate.

## Project layout

```
rust/minigrep/
├── Cargo.toml      # package manifest + dependencies
├── src/
│   ├── main.rs     # thin CLI entry point (Config::parse + error exit code)
│   └── lib.rs      # Config, run, collect_sources, collect_matching_files, format_match,
│                   #   format_count, search, search_case_insensitive, highlight + tests
├── poem.txt        # sample input to search
└── README.md
```

This structure — a thin `main.rs` over a testable `lib.rs` — is the standard pattern for
Rust CLI apps, because integration tests and other crates can import the library, but not a binary.
