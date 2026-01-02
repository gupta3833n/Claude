import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  Building2,
  Users,
  Palette,
  FileText,
  Shield,
  Database,
  Bell,
  CreditCard
} from 'lucide-react';
import { clsx } from 'clsx';

const settingsSections = [
  { id: 'company', name: 'Company', icon: Building2, path: '' },
  { id: 'users', name: 'Users & Roles', icon: Users, path: 'users' },
  { id: 'theme', name: 'Theme', icon: Palette, path: 'theme' },
  { id: 'documents', name: 'Documents', icon: FileText, path: 'documents' },
  { id: 'security', name: 'Security', icon: Shield, path: 'security' },
  { id: 'backup', name: 'Backup & Sync', icon: Database, path: 'backup' },
  { id: 'notifications', name: 'Notifications', icon: Bell, path: 'notifications' },
  { id: 'subscription', name: 'Subscription', icon: CreditCard, path: 'subscription' }
];

function CompanySettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-display font-semibold text-slate-800 dark:text-white">
        Company Details
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Company Name *</label>
          <input type="text" className="input" placeholder="Your Tour Company" />
        </div>
        <div>
          <label className="label">Trade Name</label>
          <input type="text" className="input" placeholder="Brand name if different" />
        </div>
        <div>
          <label className="label">GSTIN *</label>
          <input type="text" className="input" placeholder="27AAPFU0939F1Z5" />
        </div>
        <div>
          <label className="label">PAN *</label>
          <input type="text" className="input" placeholder="AAPFU0939F" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Address</label>
          <textarea className="input" rows={3} placeholder="Complete address" />
        </div>
        <div>
          <label className="label">State</label>
          <select className="input">
            <option>Maharashtra</option>
            <option>Delhi</option>
            <option>Karnataka</option>
          </select>
        </div>
        <div>
          <label className="label">Pincode</label>
          <input type="text" className="input" placeholder="400001" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" placeholder="company@email.com" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input type="tel" className="input" placeholder="+91 9876543210" />
        </div>
      </div>
      <button className="btn btn-primary">
        Save Changes
      </button>
    </div>
  );
}

function ThemeSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-display font-semibold text-slate-800 dark:text-white">
        Theme Customization
      </h2>
      <p className="text-slate-500 dark:text-slate-400">
        Customize your app's appearance with your brand colors.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label">Primary Color</label>
          <div className="flex gap-2">
            <input type="color" className="w-12 h-10 rounded cursor-pointer" defaultValue="#164880" />
            <input type="text" className="input flex-1" placeholder="#164880" />
          </div>
        </div>
        <div>
          <label className="label">Accent Color</label>
          <div className="flex gap-2">
            <input type="color" className="w-12 h-10 rounded cursor-pointer" defaultValue="#EB2226" />
            <input type="text" className="input flex-1" placeholder="#EB2226" />
          </div>
        </div>
      </div>

      <div>
        <label className="label">Preset Themes</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {[
            { name: 'Default Blue', primary: '#164880', accent: '#EB2226' },
            { name: 'Ocean', primary: '#0369a1', accent: '#0d9488' },
            { name: 'Forest', primary: '#166534', accent: '#ca8a04' },
            { name: 'Midnight', primary: '#4338ca', accent: '#db2777' }
          ].map(theme => (
            <button
              key={theme.name}
              className="p-4 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-primary-500 transition-colors"
            >
              <div className="flex gap-2 mb-2">
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.primary }} />
                <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.accent }} />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {theme.name}
              </p>
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary">
        Apply Theme
      </button>
    </div>
  );
}

function PlaceholderSettings({ title }: { title: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-slate-500 dark:text-slate-400">
        {title} settings coming soon...
      </p>
    </div>
  );
}

export default function Settings() {
  const location = useLocation();

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 shrink-0">
          <div className="card p-2 lg:sticky lg:top-24">
            <nav className="space-y-1">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const fullPath = section.path ? `/settings/${section.path}` : '/settings';
                const isActive = location.pathname === fullPath;

                return (
                  <NavLink
                    key={section.id}
                    to={fullPath}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    )}
                  >
                    <Icon className={clsx(
                      'w-5 h-5',
                      isActive ? 'text-primary-500' : 'text-slate-400'
                    )} />
                    {section.name}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="card">
            <Routes>
              <Route index element={<CompanySettings />} />
              <Route path="users" element={<PlaceholderSettings title="Users & Roles" />} />
              <Route path="theme" element={<ThemeSettings />} />
              <Route path="documents" element={<PlaceholderSettings title="Documents" />} />
              <Route path="security" element={<PlaceholderSettings title="Security" />} />
              <Route path="backup" element={<PlaceholderSettings title="Backup & Sync" />} />
              <Route path="notifications" element={<PlaceholderSettings title="Notifications" />} />
              <Route path="subscription" element={<PlaceholderSettings title="Subscription" />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
