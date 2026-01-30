import prisma from "../configs/prisma.js"
//Create project
export const createProject = async(req, res) => {
    try {
        const {userId} = await req.auth();
        const {workspaceId, description, name, status, start_date, end_date,
            team_members, team_lead, progress, priority
        } = req.body;
        
        if (!name || !description || !status || !start_date || !end_date || !priority) {
            return res.status(400).json({
                message: "Please fill in all fields (Name, Description, Status, Start Date, End Date, Priority)"
            });
        }

        //Check if user has admin role for workspace
        const workspace = await prisma.workspace.findUnique({
            where: {id: workspaceId},
            include: {members: {include: {user: true}}}
        })

        if(!workspace){
            return res.status(404).json({message: "Workspace not found"})
        }

        if(!workspace.members.some((member) => member.userId === userId && member.role === 'ADMIN')){
            return res.status(403).json({message: "You don't have permission to create a project in this workspace"})
        }

        //Get team Lead using email
        let teamLeadId = null;
        if (team_lead) {
            const foundMember = workspace.members.find(m => m.user.email === team_lead);
            if (!foundMember) {
                return res.status(400).json({ message: "Team Lead must be a member of this workspace" });
            }
            teamLeadId = foundMember.userId;
        }

        const project = await prisma.project.create({
            data: {
                workspaceId,
                name,
                description,
                status,
                priority,
                progress: progress || 0,
                team_lead: teamLeadId,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        })

        //Add member to project if they are in the workspace
        if(team_members?.length > 0){
            const membersToAdd = [];
            workspace.members.forEach(member => {
                if(team_members.includes(member.user.email)){
                    membersToAdd.push(member.user.id)
                }
            })
            if (membersToAdd.length > 0) {
                await prisma.projectMember.createMany({
                    data: membersToAdd.map(memberId => ({
                        projectId: project.id,
                        userId: memberId
                    }))
                })
            }
        }
        
        const projectWithMembers = await prisma.project.findUnique({
            where: {id: project.id},
            include: {
                members: {include: {user: true}},
                tasks: {include: {assignee: true, comments: {include: {user: true}}}},
                owner: true
            }
        })
        res.json({project: projectWithMembers, message:"Project created successfully"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.code || error.message})
    }
}

// Update project
export const updateProject = async (req, res) => {
    try {
        const {userId} = await req.auth();
        const {id, workspaceId, description, name, status, start_date, end_date,
            progress, priority
        } = req.body;

        //Check if user has admin role for workspace
        const workspace = await prisma.workspace.findUnique({
            where: {id: workspaceId},
            include: {members: {include: {user: true}}}
        })

        if(!workspace){
            return res.status(404).json({message: "Workspace not found"})
        }

         if(!workspace.members.some((member) => member.userId === userId && member.role === 'ADMIN')){
            const project = await prisma.project.findUnique({
                where: {id},
            })
            if(!project){
                return res.status(404).json({message: "Project not found"})
            }else if(project.team_lead !== userId){
                return res.status(403).json({message: "You don't have permission to update this project"})
            }
        }
        const project = await prisma.project.update({
            where: {id},
            data: {
                workspaceId,
                description,
                name,
                status,
                priority,
                progress,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
            }
        })
        res.json({project, message:"Project updated successfully"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.code || error.message})
    }
}


// Addmember project
export const addMember = async (req, res) => {
    try {
        const {userId} = await req.auth();
        const {projectId} = req.params;
        const {email} = req.body;

        //Check if user is project member
        const project = await prisma.project.findUnique({
            where: {id: projectId},
            include: {members: {include: {user: true}}}
        })

        if(!project){
            return res.status(404).json({message: "Project not found"})
        }

        if(project.team_lead !== userId){
            return res.status(404).json({message: "Only project lead can add members"})
        }

        const existingMember = project.members.find((member) => member.email === email);

        if(existingMember){
            return res.status(400).json({message: "User is already a member of the project"})
        }

        const user = await prisma.user.findUnique({
            where: {email}
        })
        if(!user){
            return res.status(404).json({message: "User not found"})
        }

        const member =  await prisma.projectMember.create({
            data:{
                userId: user.id,
                projectId
            }
        })

        res.json({member, message: "Member added successfully"})
    } catch (error) {
        console.log(error)
        res.status(500).json({message: error.code || error.message})
    }
}