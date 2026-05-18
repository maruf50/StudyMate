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
    <aside className="side-nav" aria-label="Primary">
      <div className="side-brand">StudyGroupFinder</div>
      {/* <div className="side-label">Find your mates</div> */}

      <nav className="side-links">
        {props.navItems.map((item) => (
          <button
            key={item.id}
            className={item.id === props.activeView ? "side-btn active" : "side-btn"}
            onClick={() => props.onNavigate(item.id)}
          >
            {ICON_MAP[item.id]}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button type="button" className="side-btn logout" onClick={props.onLogout}>
        <LogOut className="nav-icon" />
        <span>Log out</span>
      </button>
    </aside>
  );
}
