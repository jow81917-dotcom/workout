const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { updateVideo, deleteVideo, reorderVideos } = require('../controllers/videoController');

router.use(authenticate);
router.put('/reorder',  reorderVideos);
router.put('/:id',      updateVideo);
router.delete('/:id',   deleteVideo);

module.exports = router;
