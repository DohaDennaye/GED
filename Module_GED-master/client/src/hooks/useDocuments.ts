import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { Document } from "@shared/schema";

export const useDocuments = () => {
  return useQuery<Document[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      const response = await axios.get("/api/documents");
      return response.data;
    },
  });
};
