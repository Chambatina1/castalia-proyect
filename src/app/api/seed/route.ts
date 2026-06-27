import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    // Check if admin exists
    const existingAdmin = await db.user.findUnique({ where: { email: 'admin@castalia.com' } })
    if (existingAdmin) {
      return NextResponse.json({ message: 'Database already seeded', seeded: true })
    }

    const hash = (pw: string) => bcrypt.hashSync(pw, 10)

    // Users
    const admin = await db.user.create({ data: { email: 'admin@castalia.com', password: hash('admin123'), name: 'Admin Castalia', role: 'SUPER_ADMIN', position: 'Director General' } })
    const manager1 = await db.user.create({ data: { email: 'carlos@castalia.com', password: hash('password123'), name: 'Carlos Rodríguez', role: 'MANAGER', position: 'Gerente Senior' } })
    const manager2 = await db.user.create({ data: { email: 'maria@castalia.com', password: hash('password123'), name: 'María García', role: 'MANAGER', position: 'Gerente de Diseño' } })
    const employee = await db.user.create({ data: { email: 'jose@castalia.com', password: hash('password123'), name: 'José Hernández', role: 'EMPLOYEE', position: 'Técnico de Campo' } })
    const client = await db.user.create({ data: { email: 'cliente@email.com', password: hash('password123'), name: 'Roberto Méndez', role: 'CLIENT' } })

    // Projects
    const p1 = await db.project.create({ data: { name: 'Remodelación Residencia Montejo', clientName: 'Familia Ponce', clientEmail: 'ponce@email.com', address: 'Av. Montejo 1250, Mérida', city: 'Mérida', state: 'Yucatán', latitude: 20.9674, longitude: -89.5926, description: 'Remodelación completa de residencia de lujo de 450m2', status: 'ACTIVE', priority: 'HIGH', startDate: new Date('2025-03-15'), estimatedEnd: new Date('2025-09-30'), progress: 65, creatorId: manager1.id, coverImage: 'https://picsum.photos/seed/castalia-montejo/800/600' } })
    const p2 = await db.project.create({ data: { name: 'Diseño Interior Hotel Cancún', clientName: 'Hoteles del Caribe S.A.', clientEmail: 'info@hotelescaribe.com', address: 'Blvd. Kukulcán Km 12.5, Cancún', city: 'Cancún', state: 'Quintana Roo', latitude: 21.1327, longitude: -86.7486, description: 'Diseño y mobiliario personalizado para 120 habitaciones de hotel 5 estrellas', status: 'ACTIVE', priority: 'HIGH', startDate: new Date('2025-01-10'), estimatedEnd: new Date('2025-12-20'), progress: 40, creatorId: manager2.id, coverImage: 'https://picsum.photos/seed/castalia-hotel/800/600' } })
    const p3 = await db.project.create({ data: { name: 'Mantenimiento Edificio Corporativo', clientName: 'TechStart Latam', clientEmail: 'ops@techstart.com', address: 'Av. Reforma 550, CDMX', city: 'Ciudad de México', state: 'CDMX', latitude: 19.4326, longitude: -99.1332, description: 'Mantenimiento integral de installations y espacios corporativos', status: 'PAUSED', priority: 'LOW', startDate: new Date('2025-02-01'), estimatedEnd: new Date('2025-06-30'), progress: 25, creatorId: manager1.id, coverImage: 'https://picsum.photos/seed/castalia-corp/800/600' } })
    const p4 = await db.project.create({ data: { name: 'Inspección Villa Playa del Carmen', clientName: 'Inversiones Mar Azul', clientEmail: 'inversiones@marazul.com', address: 'Playa Norte 89, Playa del Carmen', city: 'Playa del Carmen', state: 'Quintana Roo', latitude: 20.6296, longitude: -87.0739, description: 'Inspección final de acabados y entrega de villa de lujo frente al mar', status: 'COMPLETED', priority: 'MEDIUM', startDate: new Date('2024-11-01'), estimatedEnd: new Date('2025-04-15'), progress: 100, completedAt: new Date('2025-04-10'), creatorId: manager2.id, coverImage: 'https://picsum.photos/seed/castalia-villa/800/600' } })

    const projects = [p1, p2, p3, p4]

    // Members
    for (const p of projects) {
      await db.projectMember.create({ data: { projectId: p.id, userId: manager1.id, role: 'MANAGER' } })
      await db.projectMember.create({ data: { projectId: p.id, userId: manager2.id, role: 'MANAGER' } })
      if (p.id !== p4.id) await db.projectMember.create({ data: { projectId: p.id, userId: employee.id, role: 'MEMBER' } })
    }

    // Photos
    const tags = ['antes,durante', 'durante', 'durante,evidencia', 'después', 'inspección', 'material', 'problema', 'cliente']
    for (let pi = 0; pi < projects.length; pi++) {
      const p = projects[pi]
      const photoCount = pi === 0 ? 14 : pi === 1 ? 12 : pi === 2 ? 6 : 10
      for (let i = 1; i <= photoCount; i++) {
        const upl = [manager1, manager2, employee][i % 3]
        await db.photo.create({
          data: {
            projectId: p.id,
            uploadedBy: upl.id,
            url: `https://picsum.photos/seed/cp${pi}-${i}/800/600`,
            thumbnailUrl: `https://picsum.photos/seed/cp${pi}-${i}/200/150`,
            fileType: i === 3 ? 'video' : 'image',
            fileName: `foto-${p.name.split(' ')[0]}-${i}.jpg`,
            width: 800, height: 600,
            latitude: p.latitude ?? 20 + Math.random(),
            longitude: p.longitude ?? -87 + Math.random(),
            tags: tags[i % tags.length],
            caption: i <= 2 ? 'Estado inicial del proyecto' : i === photoCount ? 'Avance final' : `Registro de avance etapa ${Math.ceil(i/3)}`,
            isApproved: i <= photoCount - 3,
            isVisibleToClient: i <= photoCount - 2,
            isUrgent: i === 5 && pi === 0,
          }
        })
      }
    }

    // Tasks
    const taskData = [
      { p: p1, title: 'Demolición de paredes internas', status: 'COMPLETED', priority: 'HIGH' },
      { p: p1, title: 'Instalación eléctrica nueva', status: 'IN_PROGRESS', priority: 'HIGH' },
      { p: p1, title: 'Colocación de pisos de mármol', status: 'PENDING', priority: 'MEDIUM' },
      { p: p1, title: 'Pintura y acabados finales', status: 'PENDING', priority: 'LOW' },
      { p: p2, title: 'Diseño de mobiliario habitación VIP', status: 'COMPLETED', priority: 'HIGH' },
      { p: p2, title: 'Fabricación de closet empotrado', status: 'IN_PROGRESS', priority: 'MEDIUM' },
      { p: p2, title: 'Instalación de iluminación decorativa', status: 'PENDING', priority: 'MEDIUM' },
      { p: p2, title: 'Instalación de cabezales de madera', status: 'PENDING', priority: 'LOW' },
      { p: p3, title: 'Revisión de sistema de aire', status: 'COMPLETED', priority: 'MEDIUM' },
      { p: p3, title: 'Mantenimiento de elevadores', status: 'PENDING', priority: 'HIGH' },
      { p: p4, title: 'Inspección de acabados de cocina', status: 'COMPLETED', priority: 'MEDIUM' },
      { p: p4, title: 'Verificación de instalaciones hidráulicas', status: 'COMPLETED', priority: 'HIGH' },
    ]
    for (const t of taskData) {
      const assignee = t.priority === 'HIGH' ? manager1.id : employee.id
      await db.task.create({
        data: {
          projectId: t.p.id, title: t.title, status: t.status, priority: t.priority,
          creatorId: t.p.creatorId, assigneeId: assignee,
          dueDate: new Date(Date.now() + Math.random() * 30 * 86400000),
          completedAt: t.status === 'COMPLETED' ? new Date(Date.now() - Math.random() * 7 * 86400000) : null,
        }
      })
    }

    // Chat messages
    await db.chatMessage.create({ data: { projectId: p1.id, senderId: manager1.id, content: 'Equipo, el cliente quiere ver el avance de la cocina esta semana. ¿Pueden subir fotos actualizadas?', mentions: JSON.stringify([manager2.id, employee.id]) } })
    await db.chatMessage.create({ data: { projectId: p1.id, senderId: employee.id, content: 'Sí Carlos, estaré ahí mañana temprano para documentar todo.', mentions: JSON.stringify([manager1.id]) } })
    await db.chatMessage.create({ data: { projectId: p1.id, senderId: manager2.id, content: 'El diseño de la isla de cocina está aprobado. Procedamos con la fabricación.', isInternal: true } })
    await db.chatMessage.create({ data: { senderId: manager1.id, content: 'María, ¿ya revisaste los materiales para el hotel?', mentions: JSON.stringify([manager2.id]) } })
    await db.chatMessage.create({ data: { senderId: manager2.id, content: 'Sí, todo confirmado con el proveedor. Entrega la próxima semana.' } })

    // Reports
    await db.report.create({
      projectId: p1.id, title: 'Reporte de Avance Semanal - Semana 12',
      type: 'PROGRESS', status: 'FINAL', generatedBy: manager1.id,
      content: JSON.stringify({ sections: [{ title: 'Resumen General', body: 'El proyecto avanza al 65%. Se completó la demolición y avanza la instalación eléctrica.' }, { title: 'Próximos Pasos', body: 'Continuar con instalación eléctrica y comenzar colocación de pisos.' }] }),
      photos: JSON.stringify([]),
    })
    await db.report.create({
      projectId: p4.id, title: 'Reporte de Inspección Final',
      type: 'INSPECTION', status: 'SENT', generatedBy: manager2.id, sentToEmail: 'inversiones@marazul.com',
      content: JSON.stringify({ sections: [{ title: 'Resultado de Inspección', body: 'Todos los acabados aprobados. Se entrega el proyecto satisfactoriamente.' }] }),
      photos: JSON.stringify([]),
    })

    // Internal Notes
    await db.internalNote.create({ projectId: p1.id, authorId: manager1.id, content: 'El cliente pidió cambio de especificación en los pisos. Coordinar con el proveedor antes de la próxima entrega.', isPinned: true })
    await db.internalNote.create({ projectId: p2.id, authorId: manager2.id, content: 'Muestras de tela para las cabezeras del hotel ya en el taller. El cliente prefiere tonos neutros.', isPinned: false })

    // Activity logs
    const actions = [
      { userId: employee.id, projectId: p1.id, action: 'UPLOADED', entityType: 'PHOTO', details: 'Subió 4 fotos' },
      { userId: manager1.id, projectId: p1.id, action: 'STATUS_CHANGED', entityType: 'PROJECT', details: 'Actualizó progreso al 65%' },
      { userId: manager2.id, projectId: p2.id, action: 'COMMENTED', entityType: 'PHOTO', details: 'Comentó en foto de diseño VIP' },
      { userId: employee.id, projectId: p1.id, action: 'COMPLETED', entityType: 'TASK', details: 'Completó "Demolición de paredes"' },
      { userId: manager1.id, projectId: p2.id, action: 'CREATED', entityType: 'REPORT', details: 'Creó reporte de diseño' },
      { userId: manager2.id, projectId: p3.id, action: 'UPDATED', entityType: 'PROJECT', details: 'Pausó proyecto temporalmente' },
      { userId: employee.id, projectId: p2.id, action: 'UPLOADED', entityType: 'PHOTO', details: 'Subió 2 fotos de closet' },
      { userId: manager1.id, projectId: p4.id, action: 'COMPLETED', entityType: 'PROJECT', details: 'Marcó proyecto como completado' },
    ]
    for (let i = 0; i < actions.length; i++) {
      await db.activityLog.create({ ...actions[i], createdAt: new Date(Date.now() - i * 3600000 * (2 + Math.random() * 4)) })
    }

    // Notifications
    await db.notification.create({ userId: manager1.id, title: 'Nuevas fotos', message: 'José subió 4 fotos a Remodelación Residencia Montejo', type: 'PHOTO', link: 'project-detail' })
    await db.notification.create({ userId: manager1.id, title: 'Tarea completada', message: 'Demolición de paredes internas fue completada', type: 'TASK', link: 'tasks' })
    await db.notification.create({ userId: employee.id, title: 'Nuevo mensaje', message: 'Carlos te mencionó en el chat del proyecto', type: 'INFO', link: 'chat' })
    await db.notification.create({ userId: manager2.id, title: 'Proyecto pausado', message: 'Carlos pausó el proyecto de mantenimiento', type: 'WARNING', link: 'dashboard' })

    // Client share
    await db.clientShare.create({
      projectId: p1.id, createdBy: manager1.id, clientEmail: 'ponce@email.com', clientName: 'Familia Ponce',
      token: uuidv4(), isActive: true,
      allowedPhotos: JSON.stringify([]), allowedReports: JSON.stringify([]),
      expiresAt: new Date(Date.now() + 30 * 86400000),
    })

    return NextResponse.json({ message: 'Database seeded successfully', seeded: true })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}