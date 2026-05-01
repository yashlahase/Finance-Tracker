const prisma = require('../config/db');

const createCategory = async (req, res) => {
  try {
    const { name, type } = req.body;
    const category = await prisma.category.create({
      data: {
        name,
        type,
        userId: req.user.id,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.user.id },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    const category = await prisma.category.updateMany({
      where: { id, userId: req.user.id },
      data: { name, type },
    });

    if (category.count === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transactions exist for this category
    const transactionsCount = await prisma.transaction.count({
      where: { categoryId: id, userId: req.user.id },
    });

    if (transactionsCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing transactions. Delete transactions first or reassign them.' 
      });
    }

    const category = await prisma.category.deleteMany({
      where: { id, userId: req.user.id },
    });

    if (category.count === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { createCategory, getCategories, updateCategory, deleteCategory };
