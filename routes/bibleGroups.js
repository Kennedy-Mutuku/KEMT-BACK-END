const router     = require('express').Router();
const mongoose   = require('mongoose');
const BibleGroup = require('../models/BibleGroup');
const Message    = require('../models/Message');

const LEADERS = [
  'Pastor Peter Mwiti',
  'Evaline Mukami',
  'Raymond Ewoi',
  'Vincent Mwendwa',
  'Morice Mutharimi',
  'Kennedy Mutuku',
];

const isLeader = (name) => LEADERS.some(l => name.toLowerCase().includes(l.split(' ')[0].toLowerCase()));

// GET /api/bible-groups — list all groups
router.get('/', async (req, res) => {
  try {
    const docs = await BibleGroup.find().sort({ createdAt: 1 });
    const groups = docs.map(d => ({ id: d.groupId, name: d.name, members: d.members }));
    res.json(groups);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bible-groups/arrange — auto-arrange Bible Study messages into groups
router.post('/arrange', async (req, res) => {
  try {
    const messages = await Message.find({ category: 'Bible Study' }).sort({ createdAt: 1 });

    if (messages.length === 0) {
      return res.json({ success: false, message: 'No Bible Study submissions found. Ask visitors to fill the contact form with category "Bible Study".' });
    }

    const leaders = messages.filter(m => isLeader(m.name));
    const regular = messages.filter(m => !isLeader(m.name));

    const groupCount = Math.max(1, Math.ceil(messages.length / 5));
    const groups = Array.from({ length: groupCount }, (_, i) => ({
      id:      new mongoose.Types.ObjectId().toString(),
      name:    `Bible Study Group ${i + 1}`,
      members: [],
    }));

    // Spread leaders one per group
    leaders.forEach((leader, i) => {
      groups[i % groupCount].members.push({
        _id:       leader._id.toString(),
        name:      leader.name,
        email:     leader.email,
        phone:     leader.phone || '',
        residence: leader.residence || '',
      });
    });

    // Fill regular members — minimise same residence in a group
    regular.forEach((m) => {
      const available = groups.filter(g => g.members.length < 5);
      if (!available.length) return;
      available.sort((a, b) => {
        const ar = a.members.filter(x => x.residence && x.residence === m.residence).length;
        const br = b.members.filter(x => x.residence && x.residence === m.residence).length;
        return ar !== br ? ar - br : a.members.length - b.members.length;
      });
      available[0].members.push({
        _id:       m._id.toString(),
        name:      m.name,
        email:     m.email,
        phone:     m.phone || '',
        residence: m.residence || '',
      });
    });

    const filled = groups.filter(g => g.members.length > 0);

    // Replace all existing groups
    await BibleGroup.deleteMany({});
    await BibleGroup.insertMany(filled.map(g => ({ groupId: g.id, name: g.name, members: g.members })));

    res.json({ success: true, groups: filled });
  } catch (err) {
    console.error('Arrange error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bible-groups — save / replace all groups
router.post('/', async (req, res) => {
  try {
    const { groups } = req.body;
    if (!Array.isArray(groups)) {
      return res.status(400).json({ success: false, message: 'groups array is required.' });
    }
    await BibleGroup.deleteMany({});
    if (groups.length > 0) {
      await BibleGroup.insertMany(
        groups.map(g => ({
          groupId: g.id || new mongoose.Types.ObjectId().toString(),
          name:    g.name,
          members: g.members || [],
        }))
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/bible-groups/:id — delete one group by groupId
router.delete('/:id', async (req, res) => {
  try {
    await BibleGroup.deleteOne({ groupId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
