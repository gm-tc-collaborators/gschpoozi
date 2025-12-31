import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '../services/api';

/**
 * Hook for fetching all templates on app load
 */
export function useAllTemplates() {
  return useQuery({
    queryKey: ['templates', 'all'],
    queryFn: templatesApi.getAllTemplates,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching specific board template
 */
export function useBoard(boardId: string | undefined) {
  return useQuery({
    queryKey: ['board', boardId],
    queryFn: () => templatesApi.getBoard(boardId!),
    enabled: !!boardId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching specific toolboard template
 */
export function useToolboard(toolboardId: string | undefined) {
  return useQuery({
    queryKey: ['toolboard', toolboardId],
    queryFn: () => templatesApi.getToolboard(toolboardId!),
    enabled: !!toolboardId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching motor database
 */
export function useMotors() {
  return useQuery({
    queryKey: ['motors'],
    queryFn: templatesApi.getMotors,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

