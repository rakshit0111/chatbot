const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

let expenses = [];
let stats = {};

// Function to load and parse the CSV file, and calculate stats
function loadExpenses(filePath) {
  expenses = [];
  stats = {};

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      expenses.push({
        date: new Date(row.Date),
        account: row.Account,
        category: row.Category,
        note: row.Note,
        amount: parseFloat(row.Amount),
      });
    })
    .on('end', () => {
      calculateStats();
      console.log('CSV file successfully processed and stats calculated');
      fs.unlinkSync(filePath); // Remove the file after processing
    })
    .on('error', (error) => {
      console.error('Error reading CSV file:', error);
      fs.unlinkSync(filePath); // Remove the file if there's an error
    });
}

// Function to calculate various statistics
function calculateStats() {
  if (expenses.length === 0) return;

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const highestExpense = expenses.reduce((max, expense) => (expense.amount > max.amount ? expense : max), expenses[0]);
  const lowestExpense = expenses.reduce((min, expense) => (expense.amount < min.amount ? expense : min), expenses[0]);
  const averageExpense = totalExpenses / expenses.length;

  // Calculate median
  const sortedExpenses = [...expenses].sort((a, b) => a.amount - b.amount);
  const middleIndex = Math.floor(sortedExpenses.length / 2);
  const medianExpense = sortedExpenses.length % 2 === 0
    ? (sortedExpenses[middleIndex - 1].amount + sortedExpenses[middleIndex].amount) / 2
    : sortedExpenses[middleIndex].amount;

  // Calculate total and average per category
  const categoryTotals = {};
  expenses.forEach((expense) => {
    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = { total: 0, count: 0 };
    }
    categoryTotals[expense.category].total += expense.amount;
    categoryTotals[expense.category].count += 1;
  });

  const categoryAverages = {};
  for (const category in categoryTotals) {
    categoryAverages[category] = categoryTotals[category].total / categoryTotals[category].count;
  }

  // Store all calculated stats
  stats = {
    totalExpenses,
    highestExpense,
    lowestExpense,
    averageExpense,
    medianExpense,
    categoryTotals,
    categoryAverages,
  };
}

// Endpoint to handle file upload and processing
app.post('/upload-csv', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ response: 'No file uploaded.' });
  }

  if (path.extname(req.file.originalname) !== '.csv') {
    fs.unlinkSync(req.file.path); // Remove the file if it's not a CSV
    return res.status(400).json({ response: 'Please upload a CSV file.' });
  }

  const filePath = path.join(__dirname, 'uploads', req.file.filename);

  loadExpenses(filePath);

  res.json({ response: 'CSV file is being processed. Please wait a moment.....Done!! Now you can ask me about - Total Expense, Highest Expense, Lowest Expense, Average Expense, and Median Expense.' });
});

// Respond to user's input
app.post('/chat', (req, res) => {
  const userMessage = req.body.message;
  const botResponse = generateResponse(userMessage);
  res.json({ response: botResponse });
});

// Function to generate a response based on the user's message
function generateResponse(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('total expenses') || lowerMessage.includes('total spent') || lowerMessage.includes('total expense') || lowerMessage.includes('total')) {
    return `Your total expenses are INR ${stats.totalExpenses.toFixed(2)}.`;
  } else if (lowerMessage.includes('highest expense') || lowerMessage.includes('most expensive') || lowerMessage.includes('most') || lowerMessage.includes('highest')) {
    return `Your highest expense is INR ${stats.highestExpense.amount.toFixed(2)} for ${stats.highestExpense.category} on ${stats.highestExpense.date.toDateString()}.`;
  } else if (lowerMessage.includes('lowest expense') || lowerMessage.includes('least expensive') || lowerMessage.includes('cheapest') || lowerMessage.includes('minimum') || lowerMessage.includes('lowest')) {
    return `Your lowest expense is INR ${stats.lowestExpense.amount.toFixed(2)} for ${stats.lowestExpense.category} on ${stats.lowestExpense.date.toDateString()}.`;
  } else if (lowerMessage.includes('average expense') || lowerMessage.includes('average spent') || lowerMessage.includes('average')) {
    return `Your average expense is INR ${stats.averageExpense.toFixed(2)}.`;
  } else if (lowerMessage.includes('median expense') || lowerMessage.includes('median')) {
    return `Your median expense is INR ${stats.medianExpense.toFixed(2)}.`;
  } else if (lowerMessage.includes('thanks')) {
    return `You're welcome! If you have any more questions, feel free to ask.`;
  } else if (lowerMessage.includes('spent on') || lowerMessage.includes('category')) {
    const category = lowerMessage.split(/spent on |category /)[1].trim().toLowerCase(); // Normalize to lowercase
    const normalizedCategoryTotals = Object.fromEntries(
      Object.entries(stats.categoryTotals).map(([key, value]) => [key.toLowerCase(), value]) // Normalize keys
    );
    if (normalizedCategoryTotals[category]) {
      return `You have spent INR ${normalizedCategoryTotals[category].total.toFixed(2)} on ${category}, with an average of INR ${stats.categoryAverages[category].toFixed(2)} per expense.`;
    } else {
      return `No expenses found for the category "${category}". Please ensure the category name is correct.`;
    }
  } else if (lowerMessage.includes('help')) {
    return "I can help you with your expenses! You can ask me things like 'What is my total expense?', 'What is my highest expense?', or 'How much have I spent on food?'.";
  } else if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
    return "Hello! How can I help you with your expenses today?";
  } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
    return "Goodbye! Have a great day!";
  } else {
    return "I'm not sure how to respond to that. You can ask me about your total expenses, the highest or lowest expense, or how much you've spent on a specific category.";
  }
}

app.listen(port, () => {
  console.log(`Chatbot backend running on port ${port}`);
});
