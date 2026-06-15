import { describe, expect, it } from 'vitest';
import { ProjectEntity } from '../../src/entities/project.type';
import type { Project } from '../../src/entities/project.type';

describe('ProjectEntity', () => {
  const createTestProject = (): Project => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    organizationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    name: 'Test Project',
    slug: 'test-project',
    description: 'Test description',
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'user-id',
    updatedBy: 'user-id',
  });

  describe('create', () => {
    it('should create a new project entity', () => {
      const entity = ProjectEntity.create({
        organizationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'New Project',
        description: 'New description',
        createdBy: 'user-id',
      });

      expect(entity.id).toBeDefined();
      expect(entity.name).toBe('New Project');
      expect(entity.slug).toBeDefined();
      expect(entity.organizationId).toBe(
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      );
    });
  });

  describe('update', () => {
    it('should update project name', () => {
      const project = createTestProject();
      const updated = ProjectEntity.update(project, {
        id: project.id,
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.description).toBe(project.description);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        project.updatedAt.getTime(),
      );
    });

    it('should update project description', () => {
      const project = createTestProject();
      const updated = ProjectEntity.update(project, {
        id: project.id,
        description: 'Updated description',
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.name).toBe(project.name);
    });

    it('should update project status', () => {
      const project = createTestProject();
      const updated = ProjectEntity.update(project, {
        id: project.id,
        status: 'inactive',
      });

      expect(updated.status).toBe('inactive');
    });

    it('should update updatedBy field', () => {
      const project = createTestProject();
      const updated = ProjectEntity.update(project, {
        id: project.id,
        updatedBy: 'new-user-id',
      });

      expect(updated.updatedBy).toBe('new-user-id');
    });

    it('should update multiple fields', () => {
      const project = createTestProject();
      const updated = ProjectEntity.update(project, {
        id: project.id,
        name: 'New Name',
        description: 'New Description',
        status: 'inactive',
        updatedBy: 'new-user',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.description).toBe('New Description');
      expect(updated.status).toBe('inactive');
      expect(updated.updatedBy).toBe('new-user');
    });

    it('should preserve unchanged fields', () => {
      const project = createTestProject();
      const updated = ProjectEntity.update(project, {
        id: project.id,
        name: 'Updated Name',
      });

      expect(updated.organizationId).toBe(project.organizationId);
      expect(updated.slug).toBe(project.slug);
      expect(updated.createdBy).toBe(project.createdBy);
      expect(updated.createdAt).toEqual(project.createdAt);
    });
  });
});
