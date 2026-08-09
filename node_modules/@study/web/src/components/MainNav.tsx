import type { View } from "../types";
import {
  LayoutDashboard,
  Zap,
  Users,
  BookOpen,
  UserCheck,
  MessageCircle,
  Clock,
  LogOut
} from "lucide-react";
import type { ReactNode } from "react";

type MainNavProps = {
  navItems: Array<{ id: View; label: string }>;
  activeView: View;
  onNavigate: (view: View) => void;
  onLogout: () => void;
};

const ICON_MAP: Record<View, ReactNode> = {
  dashboard: <LayoutDashboard className="nav-icon" />,
  matching: <Zap className="nav-icon" />,
  groups: <Users className="nav-icon" />,
  notes: <BookOpen className="nav-icon" />,
  friends: <UserCheck className="nav-icon" />,
  chat: <MessageCircle className="nav-icon" />,
  tracker: <Clock className="nav-icon" />
};

export function MainNav(props: MainNavProps) {
  return (
    <header className="top-navbar" aria-label="Primary">
      <div className="navbar-brand">StudyGroupFinder</div>

      <div className="navbar-right">
        <nav className="top-nav-links">
          {props.navItems.map((item) => (
            <button
              key={item.id}
              className={item.id === props.activeView ? "top-nav-btn active" : "top-nav-btn"}
              onClick={() => props.onNavigate(item.id)}
            >
              {ICON_MAP[item.id]}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button type="button" className="top-nav-btn logout" onClick={props.onLogout} title="Log out">
          <LogOut className="nav-icon" />
          <span>Log out</span>
        </button>
      </div>
    </header>
  );
}
