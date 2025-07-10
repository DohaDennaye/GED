import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Upload, Grid, List, Menu } from "lucide-react";
import DocumentSidebar from "@/components/document-sidebar";
import DocumentGrid from "@/components/document-grid";
import DocumentPreview from "@/components/document-preview";
import UploadModal from "@/components/upload-modal";
import FilterModal from "@/components/filter-modal";
import { formatFileSize } from "@/lib/file-utils";
import type { Document, Folder } from "@shared/schema";
import { useDocuments } from "@/hooks/useDocuments";
import ThemeToggleButton from "@/components/ThemeToggleButton";
import { API_BASE_URL } from "@/lib/api-config";

interface DocumentWithDetails extends Omit<Document, "createdAt" | "updatedAt" | "expirationDate"> {
  createdAt: Date;
  updatedAt: Date;
  createdByUser: {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
    createdAt: string;
  };
  folder: Folder;
}

interface DocumentStats {
  totalDocuments: number;
  expiringDocuments: number;
  pendingDocuments: number;
  totalStorage: number;
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentPath, setCurrentPath] = useState("Documents");

  // Fetch documents
  const API_BASE_URL = "http://localhost:5001";
  async function apiFetch<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`);
    if (!response.ok) throw new Error(`API error on ${path}`);
    return response.json();
  }

  const { data: documents = useDocuments() as { data: Document[] }, isLoading: documentsLoading, refetch: refetchDocuments } = useQuery<DocumentWithDetails[]>({
    queryKey: ["/api/documents", selectedFolderId],
    queryFn: async () => {
      const url = selectedFolderId
        ? `${API_BASE_URL}/api/documents?folderId=${selectedFolderId}`
        : `${API_BASE_URL}/api/documents`;
      const response = await fetch(`${API_BASE_URL}${url}`);
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
  });

  // Fetch statistics
  const { data: stats } = useQuery<DocumentStats>({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/stats`);
      if (!response.ok) throw new Error("Failed to fetch document statistics");
      return response.json();
    },
  });

  // Search documents
  const { data: searchResults = [], isLoading: searchLoading } = useQuery<DocumentWithDetails[]>({
    queryKey: ["documents", searchQuery],
    enabled: searchQuery.length > 0,
    queryFn: () => apiFetch<DocumentWithDetails[]>(`/api/search?q=${encodeURIComponent(searchQuery)}`),
  });


  function normalizeDocuments(docs: any): DocumentWithDetails[] {
    if (!Array.isArray(docs)) return [];
    return docs.map((doc) => ({
      ...doc,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : new Date(doc.updatedAt),
      expirationDate:
        doc.expirationDate == null
          ? null
          : doc.expirationDate instanceof Date
            ? doc.expirationDate
            : typeof doc.expirationDate === "string"
              ? new Date(doc.expirationDate)
              : null,
      createdByUser: {
        ...doc.createdByUser,
        createdAt: doc.createdByUser?.createdAt ?? "",
      },
    }));
  }

  const displayedDocuments = useMemo(() => {
    const docs = searchQuery ? searchResults : documents;
    return normalizeDocuments(docs);
  }, [searchQuery, searchResults, documents]);
  const isLoading = searchQuery ? searchLoading : documentsLoading;

  const handleFolderSelect = (folderId: number | null, path: string) => {
    setSelectedFolderId(folderId);
    setCurrentPath(path);
    setSelectedDocumentId(null);
  };

  const handleDocumentSelect = (documentId: number) => {
    setSelectedDocumentId(documentId);
  };

  const handleUploadSuccess = () => {
    refetchDocuments();
    setIsUploadModalOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50d dark:bg-black dark:text-white ">
      {/* Sidebar */}
      <DocumentSidebar
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onFolderSelect={handleFolderSelect}
        selectedFolderId={selectedFolderId}
        onUploadClick={() => setIsUploadModalOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden text-black dark:text-white ">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <Menu className="h-4 w-4" />
              </Button>

              {/* Breadcrumb */}
              <nav className="flex items-center space-x-2 text-sm">
                <span className="text-gray-500">Documents</span>
                {currentPath !== "Documents" && (
                  <>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-900 font-medium">{currentPath}</span>
                  </>
                )}
              </nav>
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-md mx-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Rechercher des documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />

            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 text-black dark:text-white">
              <ThemeToggleButton />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              >
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFilterModalOpen(true)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button onClick={() => setIsUploadModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-hidden text-black dark:text-white">
          <div className="flex h-full">
            {/* Document List/Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
              {/* Stats Bar */}
              {stats && (
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {stats.totalDocuments}
                        </div>
                        <div className="text-sm text-gray-600">Total Documents</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-500">
                          {stats.expiringDocuments}
                        </div>
                        <div className="text-sm text-gray-600">Expirent Bientôt</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">
                          {stats.pendingDocuments}
                        </div>
                        <div className="text-sm text-gray-600">En Attente</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-500">
                          {formatFileSize(stats.totalStorage)}
                        </div>
                        <div className="text-sm text-gray-600">Stockage Utilisé</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}


              {/* Ton composant DocumentGrid ici */}
              <DocumentGrid
                documents={displayedDocuments}
                isLoading={isLoading}
                viewMode={viewMode}
                selectedDocumentId={selectedDocumentId}
                onDocumentSelect={handleDocumentSelect}
                onDocumentUpdate={refetchDocuments}
              />
            </div>

            {/* Preview Panel */}
            {selectedDocumentId && (
              <DocumentPreview
                documentId={selectedDocumentId}
                onClose={() => setSelectedDocumentId(null)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
        selectedFolderId={selectedFolderId}
      />

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApplyFilters={(filters) => {
          console.log("Apply filters:", filters);
          setIsFilterModalOpen(false);
        }}
      />
    </div>
  );
}
