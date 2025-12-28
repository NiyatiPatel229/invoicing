import React from 'react';
import { User } from 'firebase/auth';
import { logout } from '../firebase';
import { FileText, LogOut, PlusCircle, History } from 'lucide-react';
import { GuestUser } from '../types';

interface LayoutProps {
  user: User | GuestUser | null;
  children: React.ReactNode;
  activeTab: 'create' | 'history';
  onTabChange: (tab: 'create' | 'history') => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ user, children, activeTab, onTabChange, onLogout }) => {
  const isGuest = user && 'isGuest' in user;

  // Function to get the first letter from user's name or email
  const getUserInitial = () => {
    if (!user) return '?';
    
    if (isGuest) {
      return 'G';
    }
    
    const firebaseUser = user as User;
    
    // Try to get first letter from display name
    if (firebaseUser.displayName) {
      return firebaseUser.displayName.charAt(0).toUpperCase();
    }
    
    // If no display name, get first letter from email
    if (firebaseUser.email) {
      return firebaseUser.email.charAt(0).toUpperCase();
    }
    
    return 'U'; // Default to 'U' for User
  };

  // Function to generate a background color based on the initial
  const getAvatarColor = (initial: string) => {
    const colors = [
      'bg-blue-600',
      'bg-green-600',
      'bg-purple-600',
      'bg-pink-600',
      'bg-indigo-600',
      'bg-red-600',
      'bg-yellow-600',
      'bg-teal-600'
    ];
    const index = initial.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const userInitial = getUserInitial();
  const avatarColorClass = getAvatarColor(userInitial);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-black text-white py-4 px-6 sticky top-0 z-50 no-print flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('history')}>
          <FileText className="w-8 h-8 text-white" />
          <h1 className="text-xl font-bold tracking-tight">PRO<span className="text-gray-400">INVOICE</span></h1>
          {isGuest && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-black text-[10px] font-black uppercase rounded tracking-widest">
              Guest Mode
            </span>
          )}
        </div>
        
        {user && (
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => onTabChange('create')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition ${activeTab === 'create' ? 'bg-white text-black' : 'hover:bg-gray-800'}`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Invoice</span>
              </button>
              <button 
                onClick={() => onTabChange('history')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition ${activeTab === 'history' ? 'bg-white text-black' : 'hover:bg-gray-800'}`}
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </button>
            </nav>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-700">
              {/* Avatar with first letter */}
              <div 
                className={`w-8 h-8 rounded-full ${isGuest ? 'bg-gray-700' : avatarColorClass} flex items-center justify-center border border-gray-600`}
                title={isGuest ? 'Guest User' : (user as User).displayName || (user as User).email || 'User'}
              >
                <span className="text-sm font-bold text-white">{userInitial}</span>
              </div>
              <button onClick={onLogout} className="p-2 hover:bg-red-900 rounded-full transition" title="Logout">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {isGuest && (
          <div className="max-w-4xl mx-auto mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 text-yellow-800 text-sm font-medium no-print">
            <p>You are in Guest Mode. Data is only stored in your current browser session and will be lost if you refresh or close the page.</p>
          </div>
        )}
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-sm text-gray-500 no-print">
        <p>&copy; {new Date().getFullYear()} ProInvoice Gen. Minimalist. Robust. Reliable.</p>
      </footer>
    </div>
  );
};

export default Layout;
