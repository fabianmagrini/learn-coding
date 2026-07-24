# minigrep

A tiny `grep` clone in Rust — the canonical "first real Rust project." It searches a
file for lines containing a query string and prints them. Small enough to read in one
sitting, but it exercises the concepts that make Rust *Rust*.

## What this demo teaches

| Concept | Where to look |
| --- | --- |
| **Ownership & borrowing** | `search` returns `Vec<&'a str>` — slices that borrow from the file contents, tied together by the lifetime `'a` |
| **`Result` & the `?` operator** | `Config::build` and `run` in `src/lib.rs` return `Result` instead of panicking |
| **Structs & methods** | `Config` models the parsed arguments; `Config::build` is an associated function |
| **Iterators & closures** | `.lines().filter(...).collect()` is idiomatic iterator style |
| **Pattern matching / `if let`** | `main.rs` handles errors with `unwrap_or_else` and `if let Err(e)` |
| **Environment variables** | `IGNORE_CASE` toggles case-insensitive search |
| **Unit testing** | `#[cfg(test)] mod tests` at the bottom of `src/lib.rs` |
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

# Case-sensitive search — the poem capitalises "Who", so lowercase "who"
# matches nothing here. Try "nobody" to see a hit:
cargo run -- nobody poem.txt

# Case-insensitive search (env var toggles it) — now "who" matches "Who":
IGNORE_CASE=1 cargo run -- who poem.txt
```

The `--` separates cargo's own flags from arguments passed to *your* program.

Expected output:

```
$ cargo run -- nobody poem.txt
I'm nobody! Who are you?
Are you nobody, too?

$ IGNORE_CASE=1 cargo run -- who poem.txt
I'm nobody! Who are you?
```

## Test it

```bash
cargo test
```

Five tests cover argument parsing, case-sensitive and case-insensitive search, and the
empty-result case.

## Suggested exercises (to keep learning)

1. **Add real argument parsing** with the [`clap`](https://crates.io/crates/clap) crate
   (`cargo add clap --features derive`) instead of indexing `args`.
2. **Highlight the match** in each printed line using ANSI colour codes.
3. **Read from stdin** when no file path is given, so you can pipe into it: `cat poem.txt | minigrep who`.
4. **Add a line-number flag** (`-n`) that prints `line_number: matched text`.
5. **Recurse into a directory**, searching every `.txt` file it finds.

## Project layout

```
rust/minigrep/
├── Cargo.toml      # package manifest + dependencies
├── src/
│   ├── main.rs     # thin CLI entry point (arg collection, error exit codes)
│   └── lib.rs      # Config, run, search, search_case_insensitive + tests
├── poem.txt        # sample input to search
└── README.md
```

This structure — a thin `main.rs` over a testable `lib.rs` — is the standard pattern for
Rust CLI apps, because integration tests and other crates can import the library, but not a binary.
