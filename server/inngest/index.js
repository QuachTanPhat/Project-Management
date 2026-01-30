import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

export const inngest = new Inngest({ id: "project-management" });

const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.create({
      data: {
        id: data.id,
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
        image: data?.image_url ?? "",
      },
    });
  }
);

const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    await prisma.user.delete({
      where: { id: event.data.id },
    });
  }
);

const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { data } = event;

    await prisma.user.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        email: data?.email_addresses?.[0]?.email_address ?? "",
        name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
        image: data?.image_url ?? "",
      },
      update: {
        email: data?.email_addresses?.[0]?.email_address,
        name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
        image: data?.image_url,
      },
    });
  }
);
// Inngest Functions to save workspace data to a database
const syncWorkspaceCreation = inngest.createFunction(
    { id: "sync-workspace-from-clerk" },
    { event: "clerk/organization.created" },
    async({ event }) => {
        const {data} = event
        await prisma.workspace.create({
            data: {
                id: data.id,
                name: data.name,
                slug: data.slug,
                ownerId: data.created_by,
                image_url: data.image_url
            }
        })

        // Add creator as ADMIN member
        await prisma.workspaceMember.create({
            data: {
                userId: data.created_by,
                workspaceId: data.id,
                role: "ADMIN"
            }
        })
    }
)
//Inngest Functions to update workspace data to a database
const syncWorkspaceUpdation = inngest.createFunction(
    { id: "update-workspace-from-clerk" },
    { event: "clerk/organization.updated" },
    async({ event }) => {
        const {data} = event
        await prisma.workspace.update({
            where: {id: data.id},
            data: {
                name: data.name,
                slug: data.slug,
                image_url: data.image_url
            }
        })
    }
)

// Inngest Functions to delete workspace data from a database
const syncWorkspaceDeletion = inngest.createFunction(
    { id: "delete-workspace-from-clerk" },
    { event: "clerk/organization.deleted" },
    async({ event }) => {
        const {data} = event
        await prisma.workspace.delete({
            where: {id: data.id}
        })
    }
)

// Inngest Functions to save workspace member data to a database
const syncWorkSpaceMemberCreation = inngest.createFunction(
    {id: "sync-workspace-member-from-clerk"},
    {event: "clerk/organizationInvitation.accepted"},
    async({event})=>{
        const {data}=event
        await prisma.workspaceMember.create({
            data: {
                userId: data.user_id,
                workspaceId: data.organization_id,
                role: String(data.role_name).toUpperCase()
            }
        })
    }
)

//Inngest Function to send Email on Task Creation
const sendTaskAssignmentEmail = inngest.createFunction(
  { id: "send-task-assignment-email" },
  { event: "app/task.assigned" },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;

    // STEP 1: Lấy thông tin Task ban đầu
    const task = await step.run("fetch-initial-task", async () => {
      return await prisma.task.findUnique({
        where: { id: taskId },
        include: { assignee: true, project: true }
      });
    });

    if (!task || !task.assignee) return;

    // STEP 2: Gửi Email giao việc (Assignment Email)
    await step.run("send-assignment-email", async () => {
      await sendEmail({
        to: task.assignee.email,
        subject: `New Task Assignment in: ${task.project.name}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2>Hi ${task.assignee.name || "Member"},</h2>
            <p style="font-size: 16px;">You have been assigned a new task:</p>
            <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>
            
            <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px; background-color: #f9f9f9;">
               <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description || "No description provided"}</p>
               <p style="margin: 6px 0;"><strong>Due Date:</strong> ${task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}</p>
            </div>

            <a href="${origin}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; text-decoration: none; display: inline-block;">View Task</a>
          </div>
        `
      });
    });

    // STEP 3: Xử lý Reminder (Nhắc nhở)
    // Chỉ chạy nếu có Due Date và Due Date ở tương lai
    const dueDate = new Date(task.due_date);
    const now = new Date();

    if (task.due_date && dueDate > now) {
      
      // Ngủ đến hạn chót (Sleep until due date)
      await step.sleepUntil('wait-for-due-date', dueDate);

      // STEP 4: Kiểm tra lại trạng thái Task sau khi ngủ dậy
      const latestTask = await step.run('check-task-status', async () => {
        return await prisma.task.findUnique({
          where: { id: taskId },
          select: { status: true } // Chỉ cần lấy status
        });
      });

      // Nếu task vẫn chưa xong (DONE) thì mới gửi mail nhắc
      if (latestTask && latestTask.status !== "DONE") {
        
        // STEP 5: Gửi Email nhắc nhở (Reminder) - Nằm ngang hàng, KHÔNG lồng vào step 4
        await step.run('send-reminder-email', async () => {
          await sendEmail({
            to: task.assignee.email,
            subject: `⚠️ Reminder: Task Due Today - ${task.project.name}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #dc3545;">Task Reminder</h2>
                <p>Hi ${task.assignee.name || "Member"},</p>
                <p>This is a reminder that the following task is due <strong>today</strong> and is not yet completed:</p>
                <p style="font-size: 18px; font-weight: bold; color: #333; margin: 8px 0;">${task.title}</p>
                
                <div style="margin: 20px 0;">
                  <a href="${origin}" style="background-color: #dc3545; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; text-decoration: none;">Complete Task Now</a>
                </div>
              </div>
            `
          });
        });
      }
    }
  }
);
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  syncWorkspaceCreation,
  syncWorkspaceUpdation,
  syncWorkspaceDeletion,
  syncWorkSpaceMemberCreation,
  sendTaskAssignmentEmail
];
