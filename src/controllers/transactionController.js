const prisma = require('../config/db');

const createTransaction = async (req, res) => {
  try {
    const { amount, type, categoryId, date, description } = req.body;

    // Validation: amount must be positive
    if (amount <= 0) {
      return res.status(400).json({ error: 'Transaction amount must be greater than zero' });
    }

    // Check if category exists and belongs to user
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: req.user.id }
    });

    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        type,
        categoryId,
        date: date ? new Date(date) : new Date(),
        description,
        userId: req.user.id,
      },
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type, categoryId } = req.query;
    const where = { userId: req.user.id };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, categoryId, date, description } = req.body;

    // Validation
    if (amount <= 0) {
      return res.status(400).json({ error: 'Transaction amount must be greater than zero' });
    }

    const transaction = await prisma.transaction.updateMany({
      where: { id, userId: req.user.id },
      data: {
        amount,
        type,
        categoryId,
        date: date ? new Date(date) : undefined,
        description,
      },
    });

    if (transaction.count === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await prisma.transaction.deleteMany({
      where: { id, userId: req.user.id },
    });

    if (transaction.count === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { createTransaction, getTransactions, updateTransaction, deleteTransaction };
