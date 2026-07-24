use std::env;
use std::process;

use minigrep::Config;

fn main() {
    let args: Vec<String> = env::args().collect();

    // `Config::build` returns a Result, so we handle the error case explicitly
    // instead of panicking. `unwrap_or_else` lets us run a closure on the Err.
    let config = Config::build(&args).unwrap_or_else(|err| {
        eprintln!("Problem parsing arguments: {err}");
        eprintln!("Usage: minigrep <query> <file_path>");
        process::exit(1);
    });

    // `run` returns Result<(), Box<dyn Error>>. We only care about the Err arm
    // here (`if let`), because the success value is just the unit type `()`.
    if let Err(e) = minigrep::run(config) {
        eprintln!("Application error: {e}");
        process::exit(1);
    }
}
