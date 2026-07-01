import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Dumbbell, Calendar, BarChart2, User } from 'lucide-react'

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Home'      },
  { to: '/workouts',  icon: Dumbbell,        label: 'Workouts'  },
  { to: '/calendar',  icon: Calendar,        label: 'Calendar'  },
  { to: '/analytics', icon: BarChart2,       label: 'Analytics' },
  { to: '/profile',   icon: User,            label: 'Profile'   },
]

export default function AppShell() {
  return (
    <div style={{ minHeight: '100dvh', paddingBottom: '80px' }}>
      <main>
        <Outlet />
      </main>

      <nav className="bottom-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
