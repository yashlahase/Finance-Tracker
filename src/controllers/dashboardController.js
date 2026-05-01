const prisma = require('../config/db');

const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const transactions = await prisma.transaction.findMany({
      where: { userId },
    });

    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((t) => {
      const amt = parseFloat(t.amount);
      if (t.type === 'INCOME') {
        totalIncome += amt;
      } else {
        totalExpenses += amt;
      }
    });

    const balance = totalIncome - totalExpenses;

    // Group by category
    const categorySummary = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId },
      _sum: {
        amount: true,
      },
    });

    // Enrich category summary with names
    const enrichedCategorySummary = await Promise.all(
      categorySummary.map(async (item) => {
        const category = await prisma.category.findUnique({
          where: { id: item.categoryId },
        });
        return {
          categoryName: category ? category.name : 'Unknown',
          type: category ? category.type : 'Unknown',
          totalAmount: item._sum.amount,
        };
      })
    );

    res.json({
      totalIncome,
      totalExpenses,
      balance,
      categorySummary: enrichedCategorySummary,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: new Date(`${targetYear}-01-01`),
          lte: new Date(`${targetYear}-12-31`),
        },
      },
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(targetYear, i).toLocaleString('default', { month: 'long' }),
      income: 0,
      expense: 0,
    }));

    transactions.forEach((t) => {
      const monthIndex = new Date(t.date).getMonth();
      const amt = parseFloat(t.amount);
      if (t.type === 'INCOME') {
        monthlyData[monthIndex].income += amt;
      } else {
        monthlyData[monthIndex].expense += amt;
      }
    });

    res.json(monthlyData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getDashboardSummary, getMonthlyReport };
