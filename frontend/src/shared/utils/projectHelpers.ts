import { Project } from '../../App'; 
// adjust path if needed

/**
 * ACTIVE PROJECTS FILTER UTILITY
 * Filters out historical/completed projects from the active project list.
 * Excludes projects that are both marked as 'Completed' status AND
 * have 'Approved' approval status, treating them as archived/historical data.
 */

export const getActiveProjects = (projects: Project[]) => {
  return projects.filter(
    p => !(p.status === 'Completed' && p.approvalStatus === 'Approved')
  );
};