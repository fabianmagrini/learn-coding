use std::process;

use clap::Parser;
use minigrep::Config;

fn main() {
    // `Config::parse()` (from clap's `Parser` trait) reads the process arguments,
    // and on bad input it prints a helpful error + usage and exits for us — so
    // there's no manual argument-count check here anymore. It also wires up
    // `--help` and `--version` automatically.
    let config = Config::parse();

    // `run` returns Result<(), Box<dyn Error>>. We only care about the Err arm
    // here (`if let`), because the success value is just the unit type `()`.
    if let Err(e) = minigrep::run(config) {
        eprintln!("Application error: {e}");
        process::exit(1);
    }
}
