import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen,
  Folder,
  ChevronDown,
  ChevronRight,
  Plus,
  Upload,
  FileText,
  User,
  Share2,
  Star,
  Clock,
  Archive,
  Menu,
  X
} from "lucide-react";
import type { Folder as FolderType } from "@shared/schema";

interface DocumentSidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onFolderSelect: (folderId: number | null, path: string) => void;
  selectedFolderId: number | null;
  onUploadClick: () => void;
}

interface FolderWithChildren extends FolderType {
  children?: FolderWithChildren[];
}

export default function DocumentSidebar({
  isOpen,
  isCollapsed,
  onToggleCollapse,
  onFolderSelect,
  selectedFolderId,
  onUploadClick
}: DocumentSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set([1, 6])); // Expand Comptabilité and Projets Import by default

  const API_BASE_URL = "http://localhost:5001"; // si ce n'est pas déjà défini ailleurs

  async function apiFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`);
    if (!res.ok) throw new Error(`API error on ${path}`);
    return res.json();
  }

  const { data: folders = [] } = useQuery<FolderType[]>({
    queryKey: ["/api/folders"],
    queryFn: () => apiFetch<FolderType[]>("/api/folders"),
  });

  // Build folder tree
  const buildFolderTree = (folders: FolderType[]): FolderWithChildren[] => {
    const folderMap = new Map<number, FolderWithChildren>();
    const rootFolders: FolderWithChildren[] = [];

    // First pass: create all folder objects
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Second pass: build the tree
    folders.forEach(folder => {
      const folderWithChildren = folderMap.get(folder.id)!;
      if (folder.parentId === null) {
        rootFolders.push(folderWithChildren);
      } else {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.children!.push(folderWithChildren);
        }
      }
    });

    return rootFolders;
  };

  const folderTree = buildFolderTree(folders);

  const toggleFolder = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getFolderIcon = (folder: FolderWithChildren, isExpanded: boolean) => {
    if (folder.children && folder.children.length > 0) {
      return isExpanded ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />;
    }
    return <Folder className="h-4 w-4" />;
  };

  const getFolderColor = (folderName: string) => {
    const colorMap: Record<string, string> = {
      "Comptabilité": "text-blue-500",
      "Ressources Humaines": "text-green-500",
      "Achats": "text-purple-500",
      "Projets Import": "text-orange-500",
    };
    return colorMap[folderName] || "text-gray-500";
  };

  const renderFolderTree = (folders: FolderWithChildren[], level = 0) => {
    return folders.map(folder => {
      const isExpanded = expandedFolders.has(folder.id);
      const hasChildren = folder.children && folder.children.length > 0;
      const isSelected = selectedFolderId === folder.id;

      return (
        <div key={folder.id} className="space-y-1">
          <div
            className={`flex items-center p-2 rounded-lg cursor-pointer text-sm hover:bg-gray-50 transition-colors ${isSelected ? "bg-primary/10 text-primary" : ""
              }`}
            style={{ paddingLeft: `${0.5 + level * 1.5}rem` }}
            onClick={() => onFolderSelect(folder.id, folder.path)}
          >
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="mr-1 hover:bg-gray-200 rounded p-0.5 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-400" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-4 mr-1" />}
            <div className={`mr-2 ${getFolderColor(folder.name)}`}>
              {getFolderIcon(folder, isExpanded)}
            </div>
            <span className="flex-1 truncate">{folder.name}</span>
          </div>

          {hasChildren && isExpanded && (
            <div className="space-y-1">
              {renderFolderTree(folder.children!, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const renderCollapsedFolderTree = (folders: FolderWithChildren[]): React.ReactNode => {
    return folders.map((folder) => {
      const isSelected = selectedFolderId === folder.id;

      return (
        <div key={folder.id} className="w-full">
          <div
            className={`flex items-center justify-center w-full p-2 text-sm rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? "bg-primary/10 text-primary" : "text-gray-700"
              }`}
            onClick={() => onFolderSelect(folder.id, folder.path)}
            title={folder.name}
          >
            <div className={getFolderColor(folder.name)}>
              {getFolderIcon(folder, false)}
            </div>
          </div>
        </div>
      );
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-black dark:text-white  border-r border-gray-200 flex flex-col shadow-sm transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-80'
      }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 text-black dark:text-white">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white  flex items-center">
              <FolderOpen className="text-primary mr-2 h-5 w-5" />
              Gestion Documentaire
            </h1>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>

        {/* Action Buttons */}
        {!isCollapsed && (
          <div className="flex gap-2 mt-3">
            <Button
              onClick={onUploadClick}
              className="flex-1"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {/* TODO: Add new folder */ }}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Collapsed Upload Button */}
        {isCollapsed && (
          <div className="mt-2">
            <Button
              onClick={onUploadClick}
              size="sm"
              className="w-full h-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Quick Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Filtres Rapides</h3>}
        <div className="space-y-1">
          <div
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm transition-colors ${selectedFolderId === null ? "bg-primary/10 text-primary" : ""
              }`}
            onClick={() => onFolderSelect(null, "Tous les documents")}
            title={isCollapsed ? "Tous les documents" : ""}
          >
            <span className="flex items-center">
              <FileText className={`h-4 w-4 text-gray-400 ${isCollapsed ? '' : 'mr-2'}`} />
              {!isCollapsed && "Tous les documents"}
            </span>
            {!isCollapsed && <Badge variant="secondary">∞</Badge>}
          </div>
          <div
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm`}
            title={isCollapsed ? "Mes documents" : ""}
          >
            <span className="flex items-center">
              <User className={`h-4 w-4 text-blue-400 ${isCollapsed ? '' : 'mr-2'}`} />
              {!isCollapsed && "Mes documents"}
            </span>
            {!isCollapsed && <Badge variant="secondary">-</Badge>}
          </div>
          <div
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm`}
            title={isCollapsed ? "Partagés avec moi" : ""}
          >
            <span className="flex items-center">
              <Share2 className={`h-4 w-4 text-green-400 ${isCollapsed ? '' : 'mr-2'}`} />
              {!isCollapsed && "Partagés avec moi"}
            </span>
            {!isCollapsed && <Badge variant="secondary">-</Badge>}
          </div>
          <div
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm`}
            title={isCollapsed ? "Favoris" : ""}
          >
            <span className="flex items-center">
              <Star className={`h-4 w-4 text-yellow-400 ${isCollapsed ? '' : 'mr-2'}`} />
              {!isCollapsed && "Favoris"}
            </span>
            {!isCollapsed && <Badge variant="secondary">-</Badge>}
          </div>
          <div
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm`}
            title={isCollapsed ? "Récents" : ""}
          >
            <span className="flex items-center">
              <Clock className={`h-4 w-4 text-orange-400 ${isCollapsed ? '' : 'mr-2'}`} />
              {!isCollapsed && "Récents"}
            </span>
            {!isCollapsed && <Badge variant="secondary">-</Badge>}
          </div>
        </div>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 p-4 overflow-hidden">
        {!isCollapsed && <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Structure des Dossiers</h3>}
        <ScrollArea className="h-full">
          <div className="space-y-1">
            {isCollapsed ? renderCollapsedFolderTree(folderTree) : renderFolderTree(folderTree)}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
