import { Project } from '../../App'; 
// adjust path if needed

export const getActiveProjects = (projects: Project[]) => {
  return projects.filter(
    p => !(p.status === 'Completed' && p.approvalStatus === 'Approved')
  );
};
