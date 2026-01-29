import express from 'express'
import { createTask, deleteTask, updateTask } from '../controllers/taskController.js'

const taskRoutes = express.Router()

taskRoutes.post('/', createTask)
taskRoutes.put('/:id', updateTask)
taskRoutes.post('/delete', deleteTask)

export default taskRoutes