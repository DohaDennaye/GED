import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale"
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { InferModel } from "drizzle-orm";
import { Moon, Sun } from "lucide-react";
import {
  X,
  Download,
  Share2,
  Edit,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  Eye,
  Heart,
  Star,
  Clock,
  User,
  Folder as FolderIcon,
  Tag,
  Calendar,
  FileCheck,
  Copy,
  ExternalLink,
  MoreVertical,
  Archive,
  Trash2,
  Lock,
  Unlock,
  UserIcon,
  Loader2
} from "lucide-react";
import { formatFileSize, formatDate } from "@/lib/file-utils";
import { apiRequest } from "@/lib/queryClient";
import type { Document, Folder } from "@shared/schema";
import { ReactNode, useState } from "react";
import { useTheme } from "@/hooks/use-theme";

type DocumentWithDetails = Document & {
  size: number;
  type: ReactNode;
  createdAt: string; // ou Date, selon comment tu les reçois
  updatedAt: string;
  expirationDate?: string;
  createdByUser: {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
  folder: Folder;
  path: string;
}

interface DocumentPreviewProps {
  documentId: number;
  onClose: () => void;
}
function InfoRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default function DocumentPreview({ documentId, onClose }: DocumentPreviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("details");
  const { theme, toggleTheme } = useTheme();

  const { data: document, isLoading } = useQuery<DocumentWithDetails>({
    queryKey: ["/api/documents", documentId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) throw new Error("Failed to fetch document");
      return response.json();
    },
  });

  const favoriteMetrics = {
    downloads: 12,
    views: 89,
    shares: 5
  };
  if (isLoading || !document) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  const getFileIcon = (fileType: string, mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <FileImage className="h-8 w-8 text-purple-500" />;
    }

    switch (fileType.toLowerCase()) {
      case "pdf":
        return <FileText className="h-8 w-8 text-red-500" />;
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="h-8 w-8 text-green-600" />;
      case "docx":
      case "doc":
        return <FileText className="h-8 w-8 text-blue-600" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
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

  const getUserDisplayName = (user?: DocumentWithDetails["createdByUser"]): string => {
    if (!user) return "Utilisateur inconnu"
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.username) {
      return user.username;
    }
    return "Utilisateur inconnu";
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      const response = await fetch(`/api/documents/${documentId}/download`);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = document.originalName || "document";
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);

      toast({
        title: "Téléchargement démarré",
        description: `${document.name} est en cours de téléchargement`,
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Erreur de téléchargement",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    }
  };

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/documents/${documentId}/favorite`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", documentId] });
      toast({
        title: "Favori mis à jour",
        description: "Le document a été ajouté/retiré des favoris",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Fonctionnalité en cours de développement",
        variant: "destructive",
      });
    },
  });

  const shareDocument = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/documents/${documentId}/share`, "POST", { expiresIn: "7d" });
    },
    onSuccess: () => {
      toast({
        title: "Lien de partage créé",
        description: "Le lien de partage a été copié dans le presse-papiers",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Fonctionnalité en cours de développement",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="w-full max-w-md min-w-0 bg-white/95 dark:bg-black text-black dark:text-white backdrop-blur-sm border-l border-gray-200/60 dark:border-gray-700 flex flex-col shadow-xl lg:max-w-lg xl:max-w-xl">
      {/* Modern Header with Gradient */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800"></div>
        <div className="relative p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm flex-shrink-0">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold truncate">Aperçu Document</h3>
                <p className="text-white/80 text-xs sm:text-sm">Détails et actions</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0 rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats Bar */}
          {!isLoading && document && (
            <div className="flex items-center space-x-4 text-xs text-white/90">
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>{favoriteMetrics.views}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Download className="h-3 w-3" />
                <span>{favoriteMetrics.downloads}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Share2 className="h-3 w-3" />
                <span>{favoriteMetrics.shares}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          </div>
        ) : document ? (
          <div className="p-4 sm:p-6">
            {/* File Preview Card */}
            <Card className="mb-4 sm:mb-6 overflow-hidden border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white dark:bg-gray-900" >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-center h-32 sm:h-48 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl sm:rounded-2xl border border-gray-200/50 dark:border-gray-700 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300"></div>
                  <div className="relative z-10 transform group-hover:scale-110 transition-transform duration-300">
                    {getFileIcon(document.fileType, document.mimeType)}
                  </div>
                  <div className="absolute top-4 right-4">
                    {getStatusBadge(document.status)}
                  </div>
                </div>

                <div className="mt-4 text-center">
                  <h4 className="text-lg font-bold text-gray-900 truncate mb-1 dark:text-white">{document.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 ">
                    {document.fileType.toUpperCase()} • {formatFileSize(document.fileSize)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Button
                onClick={handleDownload}
                className="flex-col h-auto py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-0"
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5 mb-1" />
                <span className="text-xs hidden sm:inline">Télécharger</span>
                <span className="text-xs sm:hidden">DL</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => shareDocument.mutate()}
                disabled={shareDocument.isPending}
                className="flex-col h-auto py-2 sm:py-3 border-2 hover:bg-gray-50"
              >
                <Share2 className="h-4 w-4 sm:h-5 sm:w-5 mb-1" />
                <span className="text-xs hidden sm:inline">Partager</span>
                <span className="text-xs sm:hidden">Share</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => toggleFavorite.mutate()}
                disabled={toggleFavorite.isPending}
                className="flex-col h-auto py-2 sm:py-3 border-2 hover:bg-gray-50"
              >
                <Heart className="h-4 w-4 sm:h-5 sm:w-5 mb-1" />
                <span className="text-xs hidden sm:inline">Favoris</span>
                <span className="text-xs sm:hidden">Fav</span>
              </Button>
              {/* 🌗 Toggle Dark/Light Mode */}
              <Button
                variant="outline"
                onClick={toggleTheme}
                className="flex-col h-auto py-2 sm:py-3 border-2 hover:bg-gray-50"
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4 mb-1" />
                ) : (
                  <Sun className="h-4 w-4 mb-1" />
                )}
                <span className="text-xs hidden sm:inline">
                  {theme === "light" ? "Sombre" : "Clair"}
                </span>
                <span className="text-xs sm:hidden">
                  {theme === "light" ? "Dark" : "Light"}
                </span>
              </Button>
            </div>

            {/* Tabbed Information */}
            <Tabs defaultValue="details" className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 rounded-xl p-1">
                <TabsTrigger value="details" className="rounded-lg text-gray-700 dark:text-gray-200">Détails</TabsTrigger>
                <TabsTrigger value="activity" className="rounded-lg text-gray-700 dark:text-gray-200 ">Activité</TabsTrigger>
                <TabsTrigger value="share" className="rounded-lg text-gray-700 dark:text-gray-200">Partage</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-4">
                {/* Owner Info */}
                <div className="grid grid-cols-1 gap-3">
                  {/* Nom et Type */}
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-black rounded-lg border border-gray-200/50">
                    <div className="flex items-center space-x-3">
                      <FileCheck className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Nom</span>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white">{document.name}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200/50">
                    <div className="flex items-center space-x-3">
                      <FileCheck className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Type</span>
                    </div>
                    <span className="text-sm text-gray-900">{document.type}</span>
                  </div>

                  {/* Taille */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200/50">
                    <div className="flex items-center space-x-3">
                      <FileCheck className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Taille</span>
                    </div>
                    <span className="text-sm text-gray-900">{(document.size / 1024).toFixed(2)} Ko</span>
                  </div>

                  {/* Dossier */}
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-black rounded-lg border border-gray-200/50">
                    <div className="flex items-center space-x-3">
                      <FolderIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ">Dossier</span>
                    </div>
                    <span className="text-sm text-gray-900 dark:text-white ">{document.folder.name}</span>
                  </div>

                  {/* Version */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200/50">
                    <div className="flex items-center space-x-3">
                      <FileCheck className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Version</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">v{document.version}</Badge>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200/50">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Créé le</span>
                    </div>
                    <span className="text-sm text-gray-900">{formatDate(document.createdAt)}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200/50">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Modifié le</span>
                    </div>
                    <span className="text-sm text-gray-900">{formatDate(document.updatedAt)}</span>
                  </div>

                  {/* Expiration (si disponible) */}
                  {document.expirationDate && (
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200/50">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-gray-700">Expiration</span>
                      </div>
                      <span className="text-sm text-gray-900">{formatDate(document.expirationDate)}</span>
                    </div>
                  )}

                  {/* Créateur */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200/50">
                    <div className="flex items-center space-x-3">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Créé par</span>
                    </div>
                    <span className="text-sm text-gray-900">
                      {`${document.createdByUser.firstName ?? ""} ${document.createdByUser.lastName ?? ""}`}
                    </span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <div className="space-y-2 text-sm">
                  <p>Téléchargements : {favoriteMetrics.downloads}</p>
                  <p>Vues : {favoriteMetrics.views}</p>
                  <p>Partages : {favoriteMetrics.shares}</p>
                </div>
              </TabsContent>

              <TabsContent value="share" className="mt-4">
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl border border-blue-200/50dark:border-blue-700 ">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Lock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900 dark:text-white">Accès sécurisé</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Document protégé par mot de passe</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => shareDocument.mutate()}
                    disabled={shareDocument.isPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Créer un lien de partage
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <File className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Document non trouvé</h3>
            <p className="text-gray-500 text-sm">Le document demandé n'existe pas ou a été supprimé.</p>
          </div>
        )}
      </div>
    </div>
  );
}
