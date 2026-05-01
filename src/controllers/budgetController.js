const prisma = require('../config/db');

const setBudget = async (req, res) => {
  try {
    const { amount, categoryId, month, year } = req.body;

    // Validation: no negative numbers
    if (amount < 0) {
      return res.status(400).json({ error: 'Budget amount cannot be negative' });
    }

    const budget = await prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId: req.user.id,
          categoryId,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
      update: {
        amount,
      },
      create: {
        amount,
        categoryId,
        month: parseInt(month),
        year: parseInt(year),
        userId: req.user.id,
      },
    });

    res.json(budget);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getBudgets = async (req, res) => {
  try {
    const { month, year } = req.query;
    const userId = req.user.id;

    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        month: month ? parseInt(month) : undefined,
        year: year ? parseInt(year) : undefined,
      },
      include: {
        category: true,
      },
    });

    // For each budget, calculate current spending
    const budgetsWithProgress = await Promise.all(
      budgets.map(async (budget) => {
        const startDate = new Date(budget.year, budget.month - 1, 1);
        const endDate = new Date(budget.year, budget.month, 0);

        const transactions = await prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId,
            date: {
              gte: startDate,
              lte: endDate,
            },
            type: 'EXPENSE',
          },
          _sum: {
            amount: true,
          },
        });

        const spent = transactions._sum.amount || 0;
        return {
          ...budget,
          spent,
          remaining: budget.amount - spent,
          progress: (spent / budget.amount) * 100,
        };
      })
    );

    res.json(budgetsWithProgress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.budget.deleteMany({
      where: { id, userId: req.user.id },
    });
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { setBudget, getBudgets, deleteBudget };
