import express from 'express'
import { addComment, getTaskComments } from '../controllers/commentController.js'

const commentRoutes = express.Router()

commentRoutes.post('/', addComment)
commentRoutes.get('/:taskId', getTaskComments)

export default commentRoutes