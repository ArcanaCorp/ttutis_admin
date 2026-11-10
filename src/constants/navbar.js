import { LayoutDashboard, School, CalendarDays, Users, BookOpen, ClipboardCheck, MessageSquare, Wallet, Settings } from 'lucide-react'

export const navbarList = [
    {
        icon: LayoutDashboard,
        title: 'Inicio',
        label: 'Resumen del colegio y actividad reciente.',
        url: '/dashboard'
    },
    {
        icon: School,
        title: 'Mi colegio',
        label: 'Nombre, logo, información y datos del colegio.',
        url: '/dashboard/my-school'
    },
    {
        icon: CalendarDays,
        title: 'Año escolar',
        label: 'Años académicos, matrículas y organización de aulas.',
        url: '/dashboard/school-year'
    },
    {
        icon: Users,
        title: 'Personas',
        label: 'Alumnos, docentes, auxiliares y apoderados.',
        url: '/dashboard/people'
    },
    {
        icon: BookOpen,
        title: 'Clases y horarios',
        label: 'Niveles, grados, secciones, cursos, profesores y horarios.',
        url: '/dashboard/classes-schedules'
    },
    {
        icon: ClipboardCheck,
        title: 'Asistencia',
        label: 'Entradas, salidas, tardanzas y faltas.',
        url: '/dashboard/attendance'
    },
    {
        icon: MessageSquare,
        title: 'Comunicaciones',
        label: 'Anuncios, citaciones y notificaciones.',
        url: '/dashboard/communications'
    },
    {
        icon: Wallet,
        title: 'Pagos',
        label: 'Cuotas, conceptos y estado de pagos.',
        url: '/dashboard/payments'
    },
    {
        icon: Settings,
        title: 'Configuración',
        label: 'Permisos, accesos y preferencias del sistema.',
        url: '/dashboard/settings'
    }
]