import prisma from "../configs/prisma.js"
import { inngest } from "../inngest/index.js";

export const createTask = async (req, res) => {
    try {
        const {userId} = await req.auth();
        const {projectId, title, description, type, status, priority, assigneeId, due_date} = req.body;

        if (!title || !description || !type || !status || !priority || !assigneeId || !due_date) {
            return res.status(400).json({ 
                message: "Please fill in all fields (Title, Description, Type, Status, Priority, Assignee, Due Date)" 
            });
        }
        const origin = req.get('origin') ;

        //Check if user is a member of the project
        const project = await prisma.project.findUnique({
            where: {id: projectId},
            include: {members: {include: {user: true}}}
        })

        if(!project){
            return res.status(404).json({message: "Project not found"})
        }else if(project.team_lead !== userId){
            return res.status(403).json({message: "You don't have permission to add tasks to this project"})
        }else if(assigneeId && !project.members.find((members) => members.user.id === assigneeId)){
            return res.status(403).json({message: "assignee is not a member of the project / workspace"})
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                type,
                priority,
                assigneeId,
                status,
                due_date: new Date(due_date)
            }
        })
        const taskWithAssignee = await prisma.task.findUnique({
            where: {id: task.id},
            include: {assignee: true}
        })

        await inngest.send({
            name: "app/task.assigned",
            data: {
                taskId: task.id,
                origin
            }
        })

        res.json({task: taskWithAssignee, message: "Task created successfully"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.code || error.message})
    }
}

//Update Task
export const updateTask = async (req, res) => {
    try {
        const task = await prisma.task.findUnique({
            where: {id: req.params.id}
        })

        if(!task){
            return res.status(404).json({message: "Task not found"})
        }

        const {userId} = await req.auth();
        
        const project = await prisma.project.findUnique({
            where: {id: task.projectId},
            include: {members: {include: {user: true}}}
        })

        if(!project){
            return res.status(404).json({message: "Project not found"})
        }else if(project.team_lead !== userId){
            return res.status(403).json({message: "You don't have permission to add tasks to this project"})
        }
        
        const updatedTask = await prisma.task.update({
            where: {id: req.params.id},
            data: req.body
        })
        
        res.json({task: updatedTask, message: "Task updated successfully"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.code || error.message})
    }
}

//Delete Task
export const deleteTask = async (req, res) => {
    try {
        const {userId} = await req.auth();
        const {tasksIds} = req.body
        const tasks = await prisma.task.findMany({
            where: {id: {in: tasksIds}}
        })

        if(tasks.length === 0){
            return res.status(404).json({message: "Tasks not found"})
        }
        
        const project = await prisma.project.findUnique({
            where: {id: tasks[0].projectId},
            include: {members: {include: {user: true}}}
        })

        if(!project){
            return res.status(404).json({message: "Project not found"})
        }else if(project.team_lead !== userId){
            return res.status(403).json({message: "You don't have permission to add tasks to this project"})
        }
        
        await prisma.task.deleteMany({
            where: {id: {in: tasksIds}}
        })


        res.json({message: "Task deleted successfully"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.code || error.message})
    }
}