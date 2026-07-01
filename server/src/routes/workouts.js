const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getWorkouts, getWorkout, createWorkout, updateWorkout, deleteWorkout,
  getCategories, createCategory,
} = require('../controllers/workoutController');
const { addVideo } = require('../controllers/videoController');
const { createSchedule } = require('../controllers/scheduleController');

router.use(authenticate);

router.get('/',              getWorkouts);
router.post('/',             createWorkout);
router.get('/categories',    getCategories);
router.post('/categories',   createCategory);
router.get('/:id',           getWorkout);
router.put('/:id',           updateWorkout);
router.delete('/:id',        deleteWorkout);
router.post('/:workoutId/videos',   addVideo);
router.post('/:workoutId/schedule', createSchedule);

module.exports = router;
