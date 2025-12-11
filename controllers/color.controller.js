const Color = require("../models/color.model");

// Create
exports.createColor = async (req, res) => {
  try {
    const color = await Color.create(req.body);
    res.status(201).json(color);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get all
exports.getColors = async (req, res) => {
  try {
    const colors = await Color.find().sort({ group: 1, name: 1 });
    res.json(colors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get one
exports.getColor = async (req, res) => {
  try {
    const color = await Color.findById(req.params.id);
    res.json(color);
  } catch (err) {
    res.status(404).json({ message: "Color not found" });
  }
};

// Update
exports.updateColor = async (req, res) => {
  try {
    const updated = await Color.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete
exports.deleteColor = async (req, res) => {
  try {
    await Color.findByIdAndDelete(req.params.id);
    res.json({ message: "Color removed" });
  } catch (err) {
    res.status(404).json({ message: "Color not found" });
  }
};
