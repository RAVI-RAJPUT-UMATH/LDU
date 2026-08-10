LDU Factorization Calculator

Live Demo: https://ldufact.netlify.app/

Overview

LDU Factorization Calculator is a web-based linear algebra tool thatdecomposes a square matrix into three matrices:

A = L · D · U

where: - L is a lower triangular matrix - D is a diagonalmatrix - U is an upper triangular matrix

The project is designed to make LDU factorization easier to understandby showing the Gaussian elimination process step by step.

Features

Generate square matrices from 1×1 to 8×8

Enter matrix values manually

Randomize matrix values

Fill the matrix with an example

Clear the matrix

Factorize the matrix instantly

Display L, D, and U matrices

Show every Gaussian elimination step

Display elimination matrices used during factorization

Calculate and display the determinant

Show pivot values

Check whether the matrix is invertible

Reconstruct the original matrix using L · D · U

Keyboard navigation using arrow keys

Paste matrix values directly from a spreadsheet

Copy the final LDU factorization

How It Works

The calculator follows the Gaussian elimination approach:

1. Enter Your Matrix

Choose the matrix dimension and enter the values into the generatedgrid.

2. Eliminate Below Each Pivot

Gaussian elimination is applied column by column to make all entriesbelow the main diagonal zero.

3. Construct L, D, and U

The elimination multipliers are used to construct L.

The pivot values form D.

The normalized upper triangular matrix forms U.

Finally, the application verifies the decomposition by reconstructingthe original matrix:

L · D · U = A

Example

For a sample 3×3 matrix, the application displays:

Starting matrix A

Each elimination step

Elimination matrices

Combined elimination matrix

Lower triangular matrix L

Diagonal matrix D

Upper triangular matrix U

Final reconstruction of A

It also provides useful information such as the determinant, pivots, andinvertibility status.

Tech Stack

HTML5 --- Structure and layout

CSS3 --- Styling and responsive interface

JavaScript --- Matrix operations, Gaussian elimination, LDUdecomposition, and interactive functionality

Project Structure

LDU-Factorization/
├── index.html
├── style.css
├── script.js
└── README.md

File names may vary depending on the project structure.

Getting Started

Clone the Repository

git clone <your-github-repository-url>
cd LDU-Factorization

Run Locally

Since this is a frontend project, you can open index.html directly ina browser or run it using a local development server such as the VS CodeLive Server extension.

Deployment

The project is deployed on Netlify and can be accessed here:

https://ldufact.netlify.app/

Educational Purpose

This project was developed as a learning-focused tool for understandingLDU factorization and Gaussian elimination. Instead of onlyproviding the final matrices, it visualizes the intermediate eliminationsteps so that students can follow how the decomposition is obtained.

Group Project

This project was developed as a group project focused on combininglinear algebra concepts with an interactive web interface.

Future Improvements

Support for matrices with zero pivots using row pivoting

More detailed error handling for singular matrices

Export results as PDF or image

Improved mobile responsiveness

Additional matrix decomposition methods such as LU, QR, and Cholesky

More interactive visualizations for matrix operations

License

This project is created for educational and academic purposes.
