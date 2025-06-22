#!/usr/bin/env python3
import csv
import hashlib
import argparse
import sys
from pathlib import Path


def get_hash_function(algorithm):
    """Get the hash function for the specified algorithm."""
    algorithms = {
        'md5': hashlib.md5,
        'sha1': hashlib.sha1,
        'sha256': hashlib.sha256,
        'sha512': hashlib.sha512,
        'blake2b': hashlib.blake2b,
        'blake2s': hashlib.blake2s
    }
    
    if algorithm.lower() not in algorithms:
        raise ValueError(f"Unsupported algorithm: {algorithm}. Supported: {', '.join(algorithms.keys())}")
    
    return algorithms[algorithm.lower()]


def hash_csv_column(input_file, output_file, column_name, algorithm='sha256'):
    """
    Read a CSV file, hash the specified column, and write to a new CSV file.
    
    Args:
        input_file (str): Path to input CSV file
        output_file (str): Path to output CSV file
        column_name (str): Name of column to hash
        algorithm (str): Hashing algorithm to use
    """
    try:
        hash_func = get_hash_function(algorithm)
        
        with open(input_file, 'r', newline='', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)
            
            if column_name not in reader.fieldnames:
                raise ValueError(f"Column '{column_name}' not found in CSV. Available columns: {', '.join(reader.fieldnames)}")
            
            with open(output_file, 'w', newline='', encoding='utf-8') as outfile:
                writer = csv.DictWriter(outfile, fieldnames=reader.fieldnames)
                writer.writeheader()
                
                for row in reader:
                    original_value = row[column_name]
                    if original_value:
                        hashed_value = hash_func(original_value.encode('utf-8')).hexdigest()
                        row[column_name] = hashed_value
                    writer.writerow(row)
        
        print(f"Successfully hashed column '{column_name}' using {algorithm.upper()} and saved to '{output_file}'")
        
    except FileNotFoundError as e:
        print(f"Error: File not found - {e}", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='Hash a specified column in a CSV file')
    parser.add_argument('input_file', help='Path to input CSV file')
    parser.add_argument('output_file', help='Path to output CSV file')
    parser.add_argument('column_name', help='Name of column to hash')
    parser.add_argument('-a', '--algorithm', default='sha256', 
                       choices=['md5', 'sha1', 'sha256', 'sha512', 'blake2b', 'blake2s'],
                       help='Hashing algorithm to use (default: sha256)')
    
    args = parser.parse_args()
    
    # Validate input file exists
    if not Path(args.input_file).exists():
        print(f"Error: Input file '{args.input_file}' does not exist", file=sys.stderr)
        sys.exit(1)
    
    hash_csv_column(args.input_file, args.output_file, args.column_name, args.algorithm)


if __name__ == '__main__':
    main()