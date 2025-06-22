# CSV Column Hasher

This script, `hashify.py`, is a command-line tool used to hash the contents of a specified column in a CSV file. It supports various hashing algorithms and writes the output to a new CSV file, preserving the original structure.

## Features

- Hashes a specified column in a CSV file.
- Supports multiple hashing algorithms: MD5, SHA1, SHA256, SHA512, BLAKE2b, BLAKE2s.
- Preserves the original CSV structure in the output file.
- Command-line interface for ease of use.

## Requirements

- Python 3.x

## Usage

To use the script, run it from the command line with the following arguments:

```bash
python hashify.py <input_file> <output_file> <column_name> [options]
```

### Arguments

- `input_file`: Path to the input CSV file.
- `output_file`: Path where the output CSV file with the hashed column will be saved.
- `column_name`: The name of the column whose values need to be hashed.

### Options

- `-a ALGORITHM`, `--algorithm ALGORITHM`: Specifies the hashing algorithm to use.
    - Supported algorithms: `md5`, `sha1`, `sha256` (default), `sha512`, `blake2b`, `blake2s`.

## Example

Suppose you have an input CSV file named `data.csv` with the following content:

```csv
id,name,email
1,Alice,alice@example.com
2,Bob,bob@example.com
3,Charlie,charlie@example.com
```

To hash the `email` column using the default `sha256` algorithm and save the output to `hashed_data.csv`, you would run:

```bash
python hashify.py data.csv hashed_data.csv email
```

The `hashed_data.csv` would then contain:

```csv
id,name,email
1,Alice,2302d195133860661502549015608393fba84503b20db3051a09101f3184e17e
2,Bob,a2a7512093a0f052526241005e107817838470879266017594197f3ab73a160c
3,Charlie,f7c925f9bbd858670b9940fcc6604710724ff890d7a472558a2db070f0982f11
```

To use a different algorithm, for example `md5`:

```bash
python hashify.py data.csv hashed_data_md5.csv email -a md5
```

This would result in `hashed_data_md5.csv` with the `email` column hashed using MD5.

## Error Handling

The script includes error handling for common issues such as:
- Input file not found.
- Specified column not found in the CSV.
- Unsupported hashing algorithm.

Error messages will be printed to standard error (stderr).
