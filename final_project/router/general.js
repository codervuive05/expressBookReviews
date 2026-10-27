const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();


public_users.post("/register", (req,res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }
  if (isValid(username)) {
    return res.status(409).json({ message: "Username already exists" });
  }
  users.push({ username, password });
  return res.status(201).json({ message: "User successfully registered" });
});

// Get the book list available in the shop
public_users.get('/',function (req, res) {
  if (Object.keys(books).length === 0) {
    return res.status(404).json({ message: 'No books found' });
  }
  return res.status(200).json(books);
});

// Get book details based on ISBN
public_users.get('/isbn/:isbn',function (req, res) {
  const book = books[req.params.isbn];
  if (!book) return res.status(404).json({ message: "Book not found" });
  return res.status(200).json({ [req.params.isbn]: book });
 });
  
// Get book details based on author
public_users.get('/author/:author',function (req, res) {
  const author = req.params.author.toLocaleLowerCase();
  const matches = Object.fromEntries(Object.entries(books).filter(([, book]) =>
    book.author.toLocaleLowerCase().includes(author)
  ));
  if (Object.keys(matches).length === 0) {
    return res.status(404).json({ message: 'No books found for this author' });
  }
  return res.status(200).json(matches);
});

// Get all books based on title
public_users.get('/title/:title',function (req, res) {
  const title = req.params.title.toLocaleLowerCase();
  const matches = Object.fromEntries(Object.entries(books).filter(([, book]) =>
    book.title.toLocaleLowerCase().includes(title)
  ));
  if (Object.keys(matches).length === 0) {
    return res.status(404).json({ message: 'No books found for this title' });
  }
  return res.status(200).json(matches);
});

//  Get book review
public_users.get('/review/:isbn',function (req, res) {
  const book = books[req.params.isbn];
  if (!book) return res.status(404).json({ message: "Book not found" });
  return res.status(200).json(book.reviews);
});

// Axios examples for task 11. They are exported so they can be reused by another
// Node client without duplicating request logic.
const apiBaseUrl = process.env.BOOK_REVIEWS_API_URL || "http://localhost:5000";

// Keep request failures actionable for callers while preserving Axios details.
const handleRequestError = (operation, error) => {
  const failure = new Error(`${operation} failed: ${error.message}`);
  failure.cause = error;
  throw failure;
};

// Inspect HTTP status explicitly: success, not found, and other server errors.
// validateStatus lets every HTTP response reach this shared handler; network
// failures still reject and are propagated by each helper's catch block.
const requestOptions = { timeout: 10000, validateStatus: () => true };
const readBookResponse = (response) => {
  if (response.status === 200) {
    if (!response.data || Object.keys(response.data).length === 0) {
      throw new Error('No books found (empty response)');
    }
    return response.data;
  }
  if (response.status === 404) {
    throw new Error(`Books not found (HTTP 404): ${response.data.message || 'No matching books'}`);
  }
  throw new Error(`Book request returned HTTP ${response.status}: ${response.data.message || 'Unexpected server response'}`);
};

// Retrieve the complete catalog using a Promise callback.
const getAllBooks = () => axios.get(apiBaseUrl, requestOptions)
  .then(readBookResponse)
  .catch((error) => handleRequestError('Get all books', error));
// Retrieve one ISBN, encoding the value before building the URL.
const getBookByISBN = (isbn) =>
  axios.get(`${apiBaseUrl}/isbn/${encodeURIComponent(isbn)}`, requestOptions)
    .then(readBookResponse)
    .catch((error) => handleRequestError('Get book by ISBN', error));

// Retrieve author matches with async/await and propagate request failures.
const getBooksByAuthor = async (author) => {
  try {
    const response = await axios.get(`${apiBaseUrl}/author/${encodeURIComponent(author)}`, requestOptions);
    return readBookResponse(response);
  } catch (error) {
    return handleRequestError('Get books by author', error);
  }
};

// Retrieve title matches with async/await and propagate request failures.
const getBooksByTitle = async (title) => {
  try {
    const response = await axios.get(`${apiBaseUrl}/title/${encodeURIComponent(title)}`, requestOptions);
    return readBookResponse(response);
  } catch (error) {
    return handleRequestError('Get books by title', error);
  }
};

module.exports.general = public_users;
module.exports.getAllBooks = getAllBooks;
module.exports.getBookByISBN = getBookByISBN;
module.exports.getBooksByAuthor = getBooksByAuthor;
module.exports.getBooksByTitle = getBooksByTitle;
