# minigrep

A tiny `grep` clone in Rust — the canonical "first real Rust project." It searches a
file for lines containing a query string and prints them. Small enough to read in one
sitting, but it exercises the concepts that make Rust *Rust*.

## What this demo teaches

| Concept | Where to look |
| --- | --- |
| **Ownership & borrowing** | `search` returns `Vec<&'a str>` — slices that borrow from the file contents, tied together by the lifetime `'a` |
| **`Result` & the `?` operator** | `run` in `src/lib.rs` returns `Result` and uses `?` to propagate file-read errors |
| **Structs & derive macros** | `Config` derives `clap::Parser`, turning the struct into the CLI definition |
| **CLI parsing with a crate** | `clap` provides argument parsing, `--help`/`--version`, and error handling — see `Config` in `src/lib.rs` |
| **Iterators & closures** | `.lines().enumerate().filter(...).map(...).collect()` is idiomatic iterator style |
| **Tuples & destructuring** | `search` returns `Vec<(usize, &str)>`; `run` unpacks `(number, line)` in the `for` pattern |
| **`Option` & `match`** | `file_path: Option<String>`; `read_input` matches `Some(path)` vs `None` (stdin) |
| **Traits (`Read`)** | `read_input` reads stdin via `std::io::stdin().read_to_string(...)` |
| **String building & slicing** | `highlight` uses `match_indices` + byte-range slices to wrap matches |
| **TTY detection** | `run` colours output only when stdout `is_terminal()`, staying plain when piped |
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
```

The `--` separates cargo's own flags from arguments passed to *your* program.

Matches are highlighted in **bold red** when you run in a terminal. Pipe the output
somewhere (e.g. `| cat`, `> out.txt`) and the highlighting is automatically dropped so
the escape codes don't end up in your file.

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
```

## Test it

```bash
cargo test
```

Fourteen tests cover clap argument parsing (positional args, an optional file path, the
`-i` and `-n` flags, a missing required `query`, and a `debug_assert` smoke test of the
CLI definition), case-sensitive and case-insensitive search including 1-based line
numbers, the empty-result case, and ANSI match highlighting (wrapping, case-insensitive
casing, multiple occurrences, and the no-match/empty-query cases).

## Suggested exercises (to keep learning)

1. ✅ **Add real argument parsing** with the [`clap`](https://crates.io/crates/clap)
   crate instead of indexing `args`. — *done; see `Config` in `src/lib.rs`.*
2. ✅ **Highlight the match** in each printed line using ANSI colour codes. — *done; see
   `highlight` in `src/lib.rs`, applied only when stdout is a terminal.*
3. ✅ **Read from stdin** when no file path is given, so you can pipe into it
   (`cat poem.txt | minigrep who`). — *done; see `read_input` in `src/lib.rs`.*
4. ✅ **Add a line-number flag** (`-n`) that prints `line_number: matched text`. — *done;
   `search` returns `(usize, &str)` pairs and `run` prefixes them when `-n` is set.*
5. **Recurse into a directory**, searching every `.txt` file it finds.

## Project layout

```
rust/minigrep/
├── Cargo.toml      # package manifest + dependencies
├── src/
│   ├── main.rs     # thin CLI entry point (Config::parse + error exit code)
│   └── lib.rs      # Config, run, read_input, search, search_case_insensitive, highlight + tests
├── poem.txt        # sample input to search
└── README.md
```

This structure — a thin `main.rs` over a testable `lib.rs` — is the standard pattern for
Rust CLI apps, because integration tests and other crates can import the library, but not a binary.
