import express from 'express'
import { addMember, createProject, updateProject } from '../controllers/projectController.js'

const projectRoutes = express.Router()

projectRoutes.post('/', createProject)
projectRoutes.put('/', updateProject)
projectRoutes.post('/:projectId/addMember', addMember)

export default projectRoutes