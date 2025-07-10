import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  MoreVertical,
  Download,
  Share2,
  Edit,       
  Trash2,
  Star
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFileSize, formatDate } from "@/lib/file-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Document, Folder } from "@shared/schema";
import ThemeToggleButton from "@/components/ThemeToggleButton";


export interface DocumentWithDetails extends DocumentWithDates {
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
import type { Document as RawDocument } from "@shared/schema";

type DocumentWithDates = Omit<RawDocument, "createdAt" | "updatedAt" | "expirationDate"> & {
  createdAt: Date;
  updatedAt: Date;
  expirationDate: Date | null;
};

interface DocumentGridProps {
  documents: DocumentWithDetails[];
  isLoading: boolean;
  viewMode: "grid" | "list";
  selectedDocumentId: number | null;
  onDocumentSelect: (documentId: number) => void;
  onDocumentUpdate: () => void;
}

export default function DocumentGrid({
  documents,
  isLoading,
  viewMode,
  selectedDocumentId,
  onDocumentSelect,
  onDocumentUpdate,
}: DocumentGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest(`/api/documents/${documentId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès.",
      });
      onDocumentUpdate();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document.",
        variant: "destructive",
      });
    },
  });

  const getFileIcon = (fileType: string, mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <FileImage className="h-6 w-6 text-purple-500" />;
    }

    switch (fileType.toLowerCase()) {
      case "pdf":
        return <FileText className="h-6 w-6 text-red-500" />;
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
      case "docx":
      case "doc":
        return <FileText className="h-6 w-6 text-blue-600" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { label: "Validé", variant: "default" as const, icon: "✓" },
      pending: { label: "En Attente", variant: "secondary" as const, icon: "⏳" },
      draft: { label: "Brouillon", variant: "outline" as const, icon: "✏️" },
      expired: { label: "Expiré", variant: "destructive" as const, icon: "⚠️" },
      cancelled: { label: "Annulé", variant: "destructive" as const, icon: "✕" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <Badge variant={config.variant} className="text-xs">
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  const handleDownload = async (documentId: number) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le document.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (documentId: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
      deleteDocumentMutation.mutate(documentId);
    }
  };

  const getUserDisplayName = (user: DocumentWithDetails["createdByUser"]) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username;
  };

  if (isLoading) {
    return (
      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-4"}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-6 w-6" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-6 w-6" />
              </div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12bg-white text-gray-900 dark:bg-gray-900 dark:text-white ">
        <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aucun document trouvé</h3>
        <p className="text-gray-500 dark:text-gray-400">Il n'y a aucun document dans ce dossier.</p>
      </div>
    );
  }

if (viewMode === "list") {
  return (
    <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((document: DocumentWithDetails) => (
                <TableRow
                  key={document.id}
                  className={`cursor-pointer hover:bg-gray-50 ${selectedDocumentId === document.id ? "bg-primary/5" : ""
                    }`}
                  onClick={() => onDocumentSelect(document.id)}
                >
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {getFileIcon(document.fileType, document.mimeType)}
                      <div>
                        <div className="font-medium text-gray-900">{document.name}</div>
                        <div className="text-sm text-gray-500">{formatFileSize(document.fileSize)}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{document.fileType.toUpperCase()}</TableCell>
                  <TableCell>{getUserDisplayName(document.createdByUser)}</TableCell>
                  <TableCell>{getStatusBadge(document.status)}</TableCell>
                  <TableCell>{formatDate(document.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleDownload(document.id)}>
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Share2 className="h-4 w-4 mr-2" />
                          Partager
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(document.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }
 if (!Array.isArray(documents)) {
   documents = [];
}
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {documents.map((document) => (
        <Card
          key={document.id}
          className={`document-card cursor-pointer transition-all hover:shadow-md ${selectedDocumentId === document.id ? "ring-2 ring-primary" : ""
            }`}
          onClick={() => onDocumentSelect(document.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {getFileIcon(document.fileType, document.mimeType)}
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-gray-900 truncate">{document.name}</h4>
                  <p className="text-sm text-gray-500">
                    {document.fileType.toUpperCase()} • {formatFileSize(document.fileSize)}
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleDownload(document.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(document.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center justify-between mb-2">
              {getStatusBadge(document.status)}
              <span className="text-xs text-gray-500">{formatDate(document.createdAt)}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Par: {getUserDisplayName(document.createdByUser)}</span>
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-gray-400" />
                <Share2 className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {document.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs cursor-pointer">
                        +{document.tags.length - 3}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{document.tags.join(", ")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
