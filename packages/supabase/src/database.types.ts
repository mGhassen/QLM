export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          email: string | null;
          id: string;
          name: string;
          picture_url: string | null;
          public_data: Json;
          updated_at: string | null;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          picture_url?: string | null;
          public_data?: Json;
          updated_at?: string | null;
          updated_by?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          picture_url?: string | null;
          public_data?: Json;
          updated_at?: string | null;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      branch: {
        Row: {
          account_id: string;
          branch_name: string | null;
          created_at: string | null;
          created_by: string | null;
          deployment_id: string | null;
          id: string;
          is_ephemeral: boolean | null;
          is_masked: boolean | null;
          is_purged: boolean | null;
          job_status: Database['public']['Enums']['job_status'];
          label_name: string;
          snapshot_id: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          account_id: string;
          branch_name?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          deployment_id?: string | null;
          id?: string;
          is_ephemeral?: boolean | null;
          is_masked?: boolean | null;
          is_purged?: boolean | null;
          job_status?: Database['public']['Enums']['job_status'];
          label_name: string;
          snapshot_id?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          account_id?: string;
          branch_name?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          deployment_id?: string | null;
          id?: string;
          is_ephemeral?: boolean | null;
          is_masked?: boolean | null;
          is_purged?: boolean | null;
          job_status?: Database['public']['Enums']['job_status'];
          label_name?: string;
          snapshot_id?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'branch_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branch_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'user_account_workspace';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branch_deployment_id_fkey';
            columns: ['deployment_id'];
            isOneToOne: false;
            referencedRelation: 'deployment_request';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'branch_snapshot_id_fkey';
            columns: ['snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'data_snapshot';
            referencedColumns: ['id'];
          },
        ];
      };
      compute: {
        Row: {
          account_id: string;
          branch_id: string | null;
          compute_status: Database['public']['Enums']['compute_status'] | null;
          created_at: string | null;
          created_by: string | null;
          deployment_id: string | null;
          id: string;
          job_status: Database['public']['Enums']['job_status'];
          label_name: string;
          performance_profile_id: string;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          account_id: string;
          branch_id?: string | null;
          compute_status?: Database['public']['Enums']['compute_status'] | null;
          created_at?: string | null;
          created_by?: string | null;
          deployment_id?: string | null;
          id?: string;
          job_status?: Database['public']['Enums']['job_status'];
          label_name: string;
          performance_profile_id: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          account_id?: string;
          branch_id?: string | null;
          compute_status?: Database['public']['Enums']['compute_status'] | null;
          created_at?: string | null;
          created_by?: string | null;
          deployment_id?: string | null;
          id?: string;
          job_status?: Database['public']['Enums']['job_status'];
          label_name?: string;
          performance_profile_id?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'compute_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compute_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'user_account_workspace';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compute_branch_id_fkey';
            columns: ['branch_id'];
            isOneToOne: false;
            referencedRelation: 'branch';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compute_deployment_id_fkey';
            columns: ['deployment_id'];
            isOneToOne: false;
            referencedRelation: 'deployment_request';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'compute_performance_profile_id_fkey';
            columns: ['performance_profile_id'];
            isOneToOne: false;
            referencedRelation: 'performance_profile';
            referencedColumns: ['id'];
          },
        ];
      };
      config: {
        Row: {
          billing_provider: Database['public']['Enums']['billing_provider'];
          enable_account_billing: boolean;
          enable_team_account_billing: boolean;
          enable_team_accounts: boolean;
        };
        Insert: {
          billing_provider?: Database['public']['Enums']['billing_provider'];
          enable_account_billing?: boolean;
          enable_team_account_billing?: boolean;
          enable_team_accounts?: boolean;
        };
        Update: {
          billing_provider?: Database['public']['Enums']['billing_provider'];
          enable_account_billing?: boolean;
          enable_team_account_billing?: boolean;
          enable_team_accounts?: boolean;
        };
        Relationships: [];
      };
      conversation_shares: {
        Row: {
          conversation_id: string;
          created_at: string | null;
          id: string;
          organization_id: string | null;
          user_id: string | null;
        };
        Insert: {
          conversation_id: string;
          created_at?: string | null;
          id?: string;
          organization_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          conversation_id?: string;
          created_at?: string | null;
          id?: string;
          organization_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversation_shares_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_shares_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversation_shares_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          datasources: Json;
          id: string;
          is_public: boolean;
          project_id: string;
          remixed_from: string | null;
          slug: string;
          task_id: string;
          title: string;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          datasources?: Json;
          id?: string;
          is_public?: boolean;
          project_id: string;
          remixed_from?: string | null;
          slug: string;
          task_id: string;
          title: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          datasources?: Json;
          id?: string;
          is_public?: boolean;
          project_id?: string;
          remixed_from?: string | null;
          slug?: string;
          task_id?: string;
          title?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_remixed_from_fkey';
            columns: ['remixed_from'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      credits_transactions: {
        Row: {
          balance_after: number;
          balance_before: number;
          consumption_amount: number | null;
          consumption_type: string | null;
          created_at: string;
          created_by: string | null;
          credits_amount: number;
          description: string | null;
          id: string;
          metadata: Json | null;
          order_id: string | null;
          organization_id: string;
          project_id: string | null;
          transaction_type: string;
          usage_id: string | null;
          user_id: string | null;
        };
        Insert: {
          balance_after: number;
          balance_before: number;
          consumption_amount?: number | null;
          consumption_type?: string | null;
          created_at?: string;
          created_by?: string | null;
          credits_amount: number;
          description?: string | null;
          id?: string;
          metadata?: Json | null;
          order_id?: string | null;
          organization_id: string;
          project_id?: string | null;
          transaction_type: string;
          usage_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          balance_after?: number;
          balance_before?: number;
          consumption_amount?: number | null;
          consumption_type?: string | null;
          created_at?: string;
          created_by?: string | null;
          credits_amount?: number;
          description?: string | null;
          id?: string;
          metadata?: Json | null;
          order_id?: string | null;
          organization_id?: string;
          project_id?: string | null;
          transaction_type?: string;
          usage_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'credits_transactions_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credits_transactions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credits_transactions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credits_transactions_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'credits_transactions_usage_id_fkey';
            columns: ['usage_id'];
            isOneToOne: false;
            referencedRelation: 'usage';
            referencedColumns: ['id'];
          },
        ];
      };
      data_clone: {
        Row: {
          account_id: string;
          branch_name: string | null;
          created_at: string | null;
          created_by: string | null;
          database_password: string | null;
          database_provider: string | null;
          database_username: string | null;
          database_version: string;
          deployment_id: string | null;
          environment_type: string | null;
          id: string;
          is_ephemeral: boolean | null;
          is_masked: boolean | null;
          is_purged: boolean | null;
          name: string;
          performance_profile_id: string | null;
          snapshot_id: string | null;
          status: string;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          account_id: string;
          branch_name?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          database_password?: string | null;
          database_provider?: string | null;
          database_username?: string | null;
          database_version?: string;
          deployment_id?: string | null;
          environment_type?: string | null;
          id?: string;
          is_ephemeral?: boolean | null;
          is_masked?: boolean | null;
          is_purged?: boolean | null;
          name: string;
          performance_profile_id?: string | null;
          snapshot_id?: string | null;
          status?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          account_id?: string;
          branch_name?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          database_password?: string | null;
          database_provider?: string | null;
          database_username?: string | null;
          database_version?: string;
          deployment_id?: string | null;
          environment_type?: string | null;
          id?: string;
          is_ephemeral?: boolean | null;
          is_masked?: boolean | null;
          is_purged?: boolean | null;
          name?: string;
          performance_profile_id?: string | null;
          snapshot_id?: string | null;
          status?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'data_clone_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_clone_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'user_account_workspace';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_clone_performance_profile_id_fkey';
            columns: ['performance_profile_id'];
            isOneToOne: false;
            referencedRelation: 'performance_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_clone_snapshot_id_fkey';
            columns: ['snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'data_snapshot';
            referencedColumns: ['id'];
          },
        ];
      };
      data_snapshot: {
        Row: {
          account_id: string;
          created_at: string | null;
          created_by: string | null;
          dataset_id: string | null;
          deployment_id: string | null;
          id: string;
          is_ephemeral: boolean | null;
          is_golden: boolean;
          name: string | null;
          parent_id: string | null;
          snapshot_comment: string | null;
          snapshot_db_roles_id: Json | null;
          snapshot_schema: Json | null;
          snapshot_type: string;
          status: string;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          account_id: string;
          created_at?: string | null;
          created_by?: string | null;
          dataset_id?: string | null;
          deployment_id?: string | null;
          id?: string;
          is_ephemeral?: boolean | null;
          is_golden?: boolean;
          name?: string | null;
          parent_id?: string | null;
          snapshot_comment?: string | null;
          snapshot_db_roles_id?: Json | null;
          snapshot_schema?: Json | null;
          snapshot_type?: string;
          status?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          account_id?: string;
          created_at?: string | null;
          created_by?: string | null;
          dataset_id?: string | null;
          deployment_id?: string | null;
          id?: string;
          is_ephemeral?: boolean | null;
          is_golden?: boolean;
          name?: string | null;
          parent_id?: string | null;
          snapshot_comment?: string | null;
          snapshot_db_roles_id?: Json | null;
          snapshot_schema?: Json | null;
          snapshot_type?: string;
          status?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'data_snapshot_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_snapshot_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'user_account_workspace';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'data_snapshot_deployment_id_fkey';
            columns: ['deployment_id'];
            isOneToOne: false;
            referencedRelation: 'deployment_request';
            referencedColumns: ['id'];
          },
        ];
      };
      datasources: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          datasource_config: Json;
          datasource_driver: string;
          datasource_kind: string;
          datasource_provider: string;
          description: string;
          id: string;
          is_private: boolean;
          is_public: boolean;
          name: string;
          project_id: string;
          remixed_from: string | null;
          slug: string;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          datasource_config?: Json;
          datasource_driver: string;
          datasource_kind: string;
          datasource_provider: string;
          description: string;
          id?: string;
          is_private?: boolean;
          is_public?: boolean;
          name: string;
          project_id: string;
          remixed_from?: string | null;
          slug: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          datasource_config?: Json;
          datasource_driver?: string;
          datasource_kind?: string;
          datasource_provider?: string;
          description?: string;
          id?: string;
          is_private?: boolean;
          is_public?: boolean;
          name?: string;
          project_id?: string;
          remixed_from?: string | null;
          slug?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'datasources_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'datasources_remixed_from_fkey';
            columns: ['remixed_from'];
            isOneToOne: false;
            referencedRelation: 'datasources';
            referencedColumns: ['id'];
          },
        ];
      };
      db_role: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          id: string;
          password: string;
          password_validity: string | null;
          privileges: Json;
          status: string;
          superuser: boolean;
          updated_at: string | null;
          updated_by: string | null;
          username: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          password: string;
          password_validity?: string | null;
          privileges?: Json;
          status?: string;
          superuser?: boolean;
          updated_at?: string | null;
          updated_by?: string | null;
          username: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          password?: string;
          password_validity?: string | null;
          privileges?: Json;
          status?: string;
          superuser?: boolean;
          updated_at?: string | null;
          updated_by?: string | null;
          username?: string;
        };
        Relationships: [];
      };
      deployment_request: {
        Row: {
          account_id: string;
          clone_id: string | null;
          created_at: string | null;
          created_by: string | null;
          current_clone: string | null;
          database_password: string | null;
          database_provider: string;
          database_username: string | null;
          database_version: string;
          db_user_id: string | null;
          deployment_parent: string | null;
          deployment_type: string;
          fqdn: string;
          id: string;
          name: string;
          node_id: string | null;
          pipeline_id: string | null;
          port: number | null;
          repository_name: string;
          snapshot_id: string | null;
          snapshot_parent: string | null;
          status: string;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          account_id: string;
          clone_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          current_clone?: string | null;
          database_password?: string | null;
          database_provider: string;
          database_username?: string | null;
          database_version?: string;
          db_user_id?: string | null;
          deployment_parent?: string | null;
          deployment_type?: string;
          fqdn: string;
          id?: string;
          name: string;
          node_id?: string | null;
          pipeline_id?: string | null;
          port?: number | null;
          repository_name: string;
          snapshot_id?: string | null;
          snapshot_parent?: string | null;
          status?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          account_id?: string;
          clone_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          current_clone?: string | null;
          database_password?: string | null;
          database_provider?: string;
          database_username?: string | null;
          database_version?: string;
          db_user_id?: string | null;
          deployment_parent?: string | null;
          deployment_type?: string;
          fqdn?: string;
          id?: string;
          name?: string;
          node_id?: string | null;
          pipeline_id?: string | null;
          port?: number | null;
          repository_name?: string;
          snapshot_id?: string | null;
          snapshot_parent?: string | null;
          status?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'deployment_request_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deployment_request_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'user_account_workspace';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deployment_request_db_user_id_fkey';
            columns: ['db_user_id'];
            isOneToOne: false;
            referencedRelation: 'db_role';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deployment_request_node_id_fkey';
            columns: ['node_id'];
            isOneToOne: false;
            referencedRelation: 'node';
            referencedColumns: ['id'];
          },
        ];
      };
      deployment_settings: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          deployment_id: string | null;
          id: string;
          is_active: boolean | null;
          setting_catalog_id: string | null;
          setting_value: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          deployment_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          setting_catalog_id?: string | null;
          setting_value?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          deployment_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          setting_catalog_id?: string | null;
          setting_value?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'deployment_settings_deployment_id_fkey';
            columns: ['deployment_id'];
            isOneToOne: false;
            referencedRelation: 'deployment_request';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deployment_settings_setting_catalog_id_fkey';
            columns: ['setting_catalog_id'];
            isOneToOne: false;
            referencedRelation: 'deployment_settings_catalog';
            referencedColumns: ['id'];
          },
        ];
      };
      deployment_settings_catalog: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          default_value: string | null;
          description: string | null;
          id: string;
          is_required: boolean | null;
          is_system_setting: boolean | null;
          node_id: string | null;
          setting_category: string;
          setting_name: string;
          setting_type: string;
          updated_at: string | null;
          updated_by: string | null;
          validation_rules: Json | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          default_value?: string | null;
          description?: string | null;
          id?: string;
          is_required?: boolean | null;
          is_system_setting?: boolean | null;
          node_id?: string | null;
          setting_category?: string;
          setting_name: string;
          setting_type?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          validation_rules?: Json | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          default_value?: string | null;
          description?: string | null;
          id?: string;
          is_required?: boolean | null;
          is_system_setting?: boolean | null;
          node_id?: string | null;
          setting_category?: string;
          setting_name?: string;
          setting_type?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          validation_rules?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'deployment_settings_catalog_node_id_fkey';
            columns: ['node_id'];
            isOneToOne: false;
            referencedRelation: 'node';
            referencedColumns: ['id'];
          },
        ];
      };
      doc_documents: {
        Row: {
          author_id: string | null;
          created_at: string;
          id: string;
          locale: string;
          published: boolean;
          slug: string;
          storage_prefix: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          created_at?: string;
          id?: string;
          locale?: string;
          published?: boolean;
          slug: string;
          storage_prefix: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          created_at?: string;
          id?: string;
          locale?: string;
          published?: boolean;
          slug?: string;
          storage_prefix?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      image_provider: {
        Row: {
          account_id: string | null;
          id: string;
          image_provider_id: string | null;
          is_active: boolean | null;
          is_default: boolean | null;
        };
        Insert: {
          account_id?: string | null;
          id?: string;
          image_provider_id?: string | null;
          is_active?: boolean | null;
          is_default?: boolean | null;
        };
        Update: {
          account_id?: string | null;
          id?: string;
          image_provider_id?: string | null;
          is_active?: boolean | null;
          is_default?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: 'image_provider_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'image_provider_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'user_account_workspace';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'image_provider_image_provider_id_fkey';
            columns: ['image_provider_id'];
            isOneToOne: false;
            referencedRelation: 'image_provider_catalog';
            referencedColumns: ['id'];
          },
        ];
      };
      image_provider_catalog: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          database_provider: string;
          database_var_name: string | null;
          database_version: string;
          default_port: number;
          id: string;
          image_name: string;
          image_registry: string | null;
          image_source: string;
          image_type: string;
          log_path: string;
          min_cpu: number;
          min_memory: number;
          password_var_name: string | null;
          registry_password: string | null;
          registry_username: string | null;
          support_status: string;
          updated_at: string | null;
          updated_by: string | null;
          user_gid: number;
          user_uid: number;
          user_var_name: string | null;
          volume_path: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          database_provider: string;
          database_var_name?: string | null;
          database_version: string;
          default_port: number;
          id?: string;
          image_name: string;
          image_registry?: string | null;
          image_source?: string;
          image_type?: string;
          log_path: string;
          min_cpu?: number;
          min_memory?: number;
          password_var_name?: string | null;
          registry_password?: string | null;
          registry_username?: string | null;
          support_status?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          user_gid: number;
          user_uid: number;
          user_var_name?: string | null;
          volume_path: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          database_provider?: string;
          database_var_name?: string | null;
          database_version?: string;
          default_port?: number;
          id?: string;
          image_name?: string;
          image_registry?: string | null;
          image_source?: string;
          image_type?: string;
          log_path?: string;
          min_cpu?: number;
          min_memory?: number;
          password_var_name?: string | null;
          registry_password?: string | null;
          registry_username?: string | null;
          support_status?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          user_gid?: number;
          user_uid?: number;
          user_var_name?: string | null;
          volume_path?: string;
        };
        Relationships: [];
      };
      integration_connections: {
        Row: {
          config: Json;
          created_at: string | null;
          created_by: string | null;
          id: string;
          name: string;
          project_id: string;
          provider: string;
          secret_ref: string | null;
          slug: string;
          test_error: string | null;
          test_identity: string | null;
          test_status: string;
          tested_at: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          config?: Json;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          name: string;
          project_id: string;
          provider: string;
          secret_ref?: string | null;
          slug: string;
          test_error?: string | null;
          test_identity?: string | null;
          test_status?: string;
          tested_at?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          config?: Json;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          name?: string;
          project_id?: string;
          provider?: string;
          secret_ref?: string | null;
          slug?: string;
          test_error?: string | null;
          test_identity?: string | null;
          test_status?: string;
          tested_at?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'integration_connections_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      invitations: {
        Row: {
          created_at: string;
          email: string;
          expires_at: string;
          id: number;
          invite_token: string;
          invited_by: string;
          organization_id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: number;
          invite_token: string;
          invited_by: string;
          organization_id: string;
          role: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: number;
          invite_token?: string;
          invited_by?: string;
          organization_id?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'invitations_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invitations_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invitations_role_fkey';
            columns: ['role'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['name'];
          },
        ];
      };
      messages: {
        Row: {
          content: Json;
          conversation_id: string;
          created_at: string | null;
          created_by: string | null;
          id: string;
          metadata: Json;
          role: string;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          content?: Json;
          conversation_id: string;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          metadata?: Json;
          role: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          content?: Json;
          conversation_id?: string;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          metadata?: Json;
          role?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      node: {
        Row: {
          account_id: string | null;
          availability_zone: string | null;
          cpu: number;
          created_at: string | null;
          created_by: string | null;
          datacenter: string;
          disk_gb: number | null;
          eligibility: Database['public']['Enums']['node_eligibility_state'];
          hosting_provider: Database['public']['Enums']['hosting_provider'];
          id: string;
          instance_type: string | null;
          ip: unknown;
          is_active: boolean;
          is_default: boolean;
          is_deleted: boolean;
          label_name: string;
          labels: Json;
          lifecycle: Database['public']['Enums']['node_lifecycle_state'];
          memory: number;
          metadata: Json | null;
          node_pool: string;
          node_status: Database['public']['Enums']['node_status'];
          node_type: Database['public']['Enums']['node_type'];
          orchestration: Database['public']['Enums']['node_orchestration_state'];
          organization_id: string | null;
          owner: string | null;
          region: string;
          storage: number;
          tags: string[];
          updated_at: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          account_id?: string | null;
          availability_zone?: string | null;
          cpu: number;
          created_at?: string | null;
          created_by?: string | null;
          datacenter: string;
          disk_gb?: number | null;
          eligibility?: Database['public']['Enums']['node_eligibility_state'];
          hosting_provider: Database['public']['Enums']['hosting_provider'];
          id?: string;
          instance_type?: string | null;
          ip?: unknown;
          is_active?: boolean;
          is_default?: boolean;
          is_deleted?: boolean;
          label_name: string;
          labels?: Json;
          lifecycle?: Database['public']['Enums']['node_lifecycle_state'];
          memory: number;
          metadata?: Json | null;
          node_pool: string;
          node_status?: Database['public']['Enums']['node_status'];
          node_type: Database['public']['Enums']['node_type'];
          orchestration?: Database['public']['Enums']['node_orchestration_state'];
          organization_id?: string | null;
          owner?: string | null;
          region: string;
          storage: number;
          tags?: string[];
          updated_at?: string | null;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          account_id?: string | null;
          availability_zone?: string | null;
          cpu?: number;
          created_at?: string | null;
          created_by?: string | null;
          datacenter?: string;
          disk_gb?: number | null;
          eligibility?: Database['public']['Enums']['node_eligibility_state'];
          hosting_provider?: Database['public']['Enums']['hosting_provider'];
          id?: string;
          instance_type?: string | null;
          ip?: unknown;
          is_active?: boolean;
          is_default?: boolean;
          is_deleted?: boolean;
          label_name?: string;
          labels?: Json;
          lifecycle?: Database['public']['Enums']['node_lifecycle_state'];
          memory?: number;
          metadata?: Json | null;
          node_pool?: string;
          node_status?: Database['public']['Enums']['node_status'];
          node_type?: Database['public']['Enums']['node_type'];
          orchestration?: Database['public']['Enums']['node_orchestration_state'];
          organization_id?: string | null;
          owner?: string | null;
          region?: string;
          storage?: number;
          tags?: string[];
          updated_at?: string | null;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'node_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'node_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'user_account_workspace';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'node_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'node_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      node_drain: {
        Row: {
          active: boolean;
          completed_at: string | null;
          created_at: string;
          deadline: string | null;
          force: boolean;
          ignore_system_jobs: boolean;
          node_id: string;
          started_at: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          completed_at?: string | null;
          created_at?: string;
          deadline?: string | null;
          force?: boolean;
          ignore_system_jobs?: boolean;
          node_id: string;
          started_at?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          completed_at?: string | null;
          created_at?: string;
          deadline?: string | null;
          force?: boolean;
          ignore_system_jobs?: boolean;
          node_id?: string;
          started_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'node_drain_node_id_fkey';
            columns: ['node_id'];
            isOneToOne: true;
            referencedRelation: 'node';
            referencedColumns: ['id'];
          },
        ];
      };
      node_runtime_state: {
        Row: {
          cpu_util_pct: number | null;
          disk_util_pct: number | null;
          health: Database['public']['Enums']['node_health'];
          last_seen_at: string | null;
          mem_util_pct: number | null;
          node_id: string;
          updated_at: string;
        };
        Insert: {
          cpu_util_pct?: number | null;
          disk_util_pct?: number | null;
          health?: Database['public']['Enums']['node_health'];
          last_seen_at?: string | null;
          mem_util_pct?: number | null;
          node_id: string;
          updated_at?: string;
        };
        Update: {
          cpu_util_pct?: number | null;
          disk_util_pct?: number | null;
          health?: Database['public']['Enums']['node_health'];
          last_seen_at?: string | null;
          mem_util_pct?: number | null;
          node_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'node_runtime_state_node_id_fkey';
            columns: ['node_id'];
            isOneToOne: true;
            referencedRelation: 'node';
            referencedColumns: ['id'];
          },
        ];
      };
      nonces: {
        Row: {
          client_token: string;
          created_at: string;
          expires_at: string;
          id: string;
          last_verification_at: string | null;
          last_verification_ip: unknown;
          last_verification_user_agent: string | null;
          metadata: Json | null;
          nonce: string;
          purpose: string;
          revoked: boolean;
          revoked_reason: string | null;
          scopes: string[] | null;
          used_at: string | null;
          user_id: string | null;
          verification_attempts: number;
        };
        Insert: {
          client_token: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          last_verification_at?: string | null;
          last_verification_ip?: unknown;
          last_verification_user_agent?: string | null;
          metadata?: Json | null;
          nonce: string;
          purpose: string;
          revoked?: boolean;
          revoked_reason?: string | null;
          scopes?: string[] | null;
          used_at?: string | null;
          user_id?: string | null;
          verification_attempts?: number;
        };
        Update: {
          client_token?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          last_verification_at?: string | null;
          last_verification_ip?: unknown;
          last_verification_user_agent?: string | null;
          metadata?: Json | null;
          nonce?: string;
          purpose?: string;
          revoked?: boolean;
          revoked_reason?: string | null;
          scopes?: string[] | null;
          used_at?: string | null;
          user_id?: string | null;
          verification_attempts?: number;
        };
        Relationships: [];
      };
      notebook_shares: {
        Row: {
          created_at: string | null;
          id: string;
          notebook_id: string;
          organization_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          notebook_id: string;
          organization_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          notebook_id?: string;
          organization_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notebook_shares_notebook_id_fkey';
            columns: ['notebook_id'];
            isOneToOne: false;
            referencedRelation: 'notebooks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notebook_shares_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notebook_shares_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      notebook_versions: {
        Row: {
          data: Json;
          notebook_id: string;
          saved_at: string;
          version: number;
          version_id: string;
        };
        Insert: {
          data: Json;
          notebook_id: string;
          saved_at?: string;
          version: number;
          version_id?: string;
        };
        Update: {
          data?: Json;
          notebook_id?: string;
          saved_at?: string;
          version?: number;
          version_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notebook_versions_notebook_id_fkey';
            columns: ['notebook_id'];
            isOneToOne: false;
            referencedRelation: 'notebooks';
            referencedColumns: ['id'];
          },
        ];
      };
      notebooks: {
        Row: {
          cells: Json;
          created_at: string | null;
          created_by: string | null;
          datasources: Json;
          description: string | null;
          id: string;
          is_public: boolean;
          project_id: string;
          remixed_from: string | null;
          slug: string;
          title: string;
          updated_at: string | null;
          updated_by: string | null;
          version: number;
        };
        Insert: {
          cells?: Json;
          created_at?: string | null;
          created_by?: string | null;
          datasources?: Json;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          project_id: string;
          remixed_from?: string | null;
          slug: string;
          title: string;
          updated_at?: string | null;
          updated_by?: string | null;
          version?: number;
        };
        Update: {
          cells?: Json;
          created_at?: string | null;
          created_by?: string | null;
          datasources?: Json;
          description?: string | null;
          id?: string;
          is_public?: boolean;
          project_id?: string;
          remixed_from?: string | null;
          slug?: string;
          title?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'notebooks_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notebooks_remixed_from_fkey';
            columns: ['remixed_from'];
            isOneToOne: false;
            referencedRelation: 'notebooks';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          account_id: string;
          body: string;
          channel: Database['public']['Enums']['notification_channel'];
          created_at: string;
          dismissed: boolean;
          expires_at: string | null;
          id: number;
          link: string | null;
          type: Database['public']['Enums']['notification_type'];
        };
        Insert: {
          account_id: string;
          body: string;
          channel?: Database['public']['Enums']['notification_channel'];
          created_at?: string;
          dismissed?: boolean;
          expires_at?: string | null;
          id?: never;
          link?: string | null;
          type?: Database['public']['Enums']['notification_type'];
        };
        Update: {
          account_id?: string;
          body?: string;
          channel?: Database['public']['Enums']['notification_channel'];
          created_at?: string;
          dismissed?: boolean;
          expires_at?: string | null;
          id?: never;
          link?: string | null;
          type?: Database['public']['Enums']['notification_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'user_account_workspace';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          order_id: string;
          price_amount: number | null;
          product_id: string;
          quantity: number;
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          order_id: string;
          price_amount?: number | null;
          product_id: string;
          quantity?: number;
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string;
          price_amount?: number | null;
          product_id?: string;
          quantity?: number;
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          billing_provider: Database['public']['Enums']['billing_provider'];
          created_at: string;
          currency: string;
          customer_id: string;
          id: string;
          organization_id: string;
          status: Database['public']['Enums']['payment_status'];
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          billing_provider: Database['public']['Enums']['billing_provider'];
          created_at?: string;
          currency: string;
          customer_id: string;
          id: string;
          organization_id: string;
          status: Database['public']['Enums']['payment_status'];
          total_amount: number;
          updated_at?: string;
        };
        Update: {
          billing_provider?: Database['public']['Enums']['billing_provider'];
          created_at?: string;
          currency?: string;
          customer_id?: string;
          id?: string;
          organization_id?: string;
          status?: Database['public']['Enums']['payment_status'];
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_memberships: {
        Row: {
          account_role: string;
          created_at: string;
          created_by: string | null;
          organization_id: string;
          updated_at: string;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          account_role: string;
          created_at?: string;
          created_by?: string | null;
          organization_id: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id: string;
        };
        Update: {
          account_role?: string;
          created_at?: string;
          created_by?: string | null;
          organization_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_memberships_account_role_fkey';
            columns: ['account_role'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['name'];
          },
          {
            foreignKeyName: 'organization_memberships_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_memberships_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          credits_balance: number;
          credits_total_allocated: number;
          credits_total_consumed: number;
          credits_total_purchased: number;
          email: string | null;
          hide_sidebar: boolean;
          id: string;
          name: string;
          picture_url: string | null;
          public_data: Json;
          slug: string;
          updated_at: string | null;
          updated_by: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          credits_balance?: number;
          credits_total_allocated?: number;
          credits_total_consumed?: number;
          credits_total_purchased?: number;
          email?: string | null;
          hide_sidebar?: boolean;
          id?: string;
          name: string;
          picture_url?: string | null;
          public_data?: Json;
          slug: string;
          updated_at?: string | null;
          updated_by?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          credits_balance?: number;
          credits_total_allocated?: number;
          credits_total_consumed?: number;
          credits_total_purchased?: number;
          email?: string | null;
          hide_sidebar?: boolean;
          id?: string;
          name?: string;
          picture_url?: string | null;
          public_data?: Json;
          slug?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      performance_profile: {
        Row: {
          account_id: string | null;
          config_flags: Json | null;
          created_at: string | null;
          created_by: string | null;
          database_provider: string;
          database_version: string;
          description_text: string | null;
          id: string;
          is_active: boolean;
          is_default: boolean;
          is_seed: boolean;
          label_name: string;
          min_cpu: number;
          min_memory: number;
          profile_key: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          account_id?: string | null;
          config_flags?: Json | null;
          created_at?: string | null;
          created_by?: string | null;
          database_provider: string;
          database_version: string;
          description_text?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          is_seed?: boolean;
          label_name: string;
          min_cpu?: number;
          min_memory?: number;
          profile_key?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          account_id?: string | null;
          config_flags?: Json | null;
          created_at?: string | null;
          created_by?: string | null;
          database_provider?: string;
          database_version?: string;
          description_text?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          is_seed?: boolean;
          label_name?: string;
          min_cpu?: number;
          min_memory?: number;
          profile_key?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'performance_profile_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'performance_profile_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'user_account_workspace';
            referencedColumns: ['id'];
          },
        ];
      };
      prediction_agent_conversations: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          project_id: string;
          snapshot_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          project_id: string;
          snapshot_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          project_id?: string;
          snapshot_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prediction_agent_conversations_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prediction_agent_conversations_snapshot_id_fkey';
            columns: ['snapshot_id'];
            isOneToOne: false;
            referencedRelation: 'prediction_schema_snapshots';
            referencedColumns: ['id'];
          },
        ];
      };
      prediction_agent_messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          role: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'prediction_agent_messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'prediction_agent_conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      prediction_schema_snapshots: {
        Row: {
          datasource_id: string;
          id: string;
          metadata: Json;
          project_id: string;
          taken_at: string;
          taken_by: string;
          version: number;
        };
        Insert: {
          datasource_id: string;
          id?: string;
          metadata: Json;
          project_id: string;
          taken_at?: string;
          taken_by: string;
          version: number;
        };
        Update: {
          datasource_id?: string;
          id?: string;
          metadata?: Json;
          project_id?: string;
          taken_at?: string;
          taken_by?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'prediction_schema_snapshots_datasource_id_fkey';
            columns: ['datasource_id'];
            isOneToOne: false;
            referencedRelation: 'datasources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prediction_schema_snapshots_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      project_quotas: {
        Row: {
          created_at: string;
          credits_allocated: number;
          credits_remaining: number | null;
          credits_used: number;
          id: string;
          is_active: boolean | null;
          organization_id: string;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          credits_allocated?: number;
          credits_remaining?: number | null;
          credits_used?: number;
          id?: string;
          is_active?: boolean | null;
          organization_id: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          credits_allocated?: number;
          credits_remaining?: number | null;
          credits_used?: number;
          id?: string;
          is_active?: boolean | null;
          organization_id?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_quotas_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_quotas_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_quotas_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: true;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          slug: string;
          status: string | null;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          slug: string;
          status?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          slug?: string;
          status?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      resources: {
        Row: {
          account_id: string | null;
          created_at: string | null;
          created_by: string | null;
          id: string;
          metadata: Json;
          resource_type: string;
          resource_unit: string;
          resource_value: number;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          account_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          metadata?: Json;
          resource_type: string;
          resource_unit: string;
          resource_value: number;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          account_id?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          metadata?: Json;
          resource_type?: string;
          resource_unit?: string;
          resource_value?: number;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'resources_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'resources_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'user_account_workspace';
            referencedColumns: ['id'];
          },
        ];
      };
      role_permissions: {
        Row: {
          id: number;
          permission: Database['public']['Enums']['app_permissions'];
          role: string;
        };
        Insert: {
          id?: number;
          permission: Database['public']['Enums']['app_permissions'];
          role: string;
        };
        Update: {
          id?: number;
          permission?: Database['public']['Enums']['app_permissions'];
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_role_fkey';
            columns: ['role'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['name'];
          },
        ];
      };
      roles: {
        Row: {
          hierarchy_level: number;
          name: string;
        };
        Insert: {
          hierarchy_level: number;
          name: string;
        };
        Update: {
          hierarchy_level?: number;
          name?: string;
        };
        Relationships: [];
      };
      subscription_items: {
        Row: {
          created_at: string;
          id: string;
          interval: string;
          interval_count: number;
          price_amount: number | null;
          product_id: string;
          quantity: number;
          subscription_id: string;
          type: Database['public']['Enums']['subscription_item_type'];
          updated_at: string;
          variant_id: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          interval: string;
          interval_count: number;
          price_amount?: number | null;
          product_id: string;
          quantity?: number;
          subscription_id: string;
          type: Database['public']['Enums']['subscription_item_type'];
          updated_at?: string;
          variant_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          interval?: string;
          interval_count?: number;
          price_amount?: number | null;
          product_id?: string;
          quantity?: number;
          subscription_id?: string;
          type?: Database['public']['Enums']['subscription_item_type'];
          updated_at?: string;
          variant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscription_items_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          active: boolean;
          billing_provider: Database['public']['Enums']['billing_provider'];
          cancel_at_period_end: boolean;
          created_at: string;
          currency: string;
          customer_id: string;
          id: string;
          organization_id: string;
          period_ends_at: string;
          period_starts_at: string;
          status: Database['public']['Enums']['subscription_status'];
          trial_ends_at: string | null;
          trial_starts_at: string | null;
          updated_at: string;
        };
        Insert: {
          active: boolean;
          billing_provider: Database['public']['Enums']['billing_provider'];
          cancel_at_period_end: boolean;
          created_at?: string;
          currency: string;
          customer_id: string;
          id: string;
          organization_id: string;
          period_ends_at: string;
          period_starts_at: string;
          status: Database['public']['Enums']['subscription_status'];
          trial_ends_at?: string | null;
          trial_starts_at?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          billing_provider?: Database['public']['Enums']['billing_provider'];
          cancel_at_period_end?: boolean;
          created_at?: string;
          currency?: string;
          customer_id?: string;
          id?: string;
          organization_id?: string;
          period_ends_at?: string;
          period_starts_at?: string;
          status?: Database['public']['Enums']['subscription_status'];
          trial_ends_at?: string | null;
          trial_starts_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      todos: {
        Row: {
          conversation_id: string;
          items: Json;
          updated_at: string;
        };
        Insert: {
          conversation_id: string;
          items?: Json;
          updated_at?: string;
        };
        Update: {
          conversation_id?: string;
          items?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'todos_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: true;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      usage: {
        Row: {
          cached_input_tokens: number;
          context_size: number;
          conversation_id: string;
          cost: number;
          cpu: number;
          created_at: string;
          credits_cap: number;
          credits_used: number;
          gpu: number;
          id: string;
          input_tokens: number;
          memory: number;
          model: string;
          network: number;
          organization_id: string;
          output_tokens: number;
          project_id: string;
          reasoning_tokens: number;
          storage: number;
          total_tokens: number;
          user_id: string;
        };
        Insert: {
          cached_input_tokens?: number;
          context_size?: number;
          conversation_id: string;
          cost?: number;
          cpu?: number;
          created_at?: string;
          credits_cap?: number;
          credits_used?: number;
          gpu?: number;
          id?: string;
          input_tokens?: number;
          memory?: number;
          model: string;
          network?: number;
          organization_id: string;
          output_tokens?: number;
          project_id: string;
          reasoning_tokens?: number;
          storage?: number;
          total_tokens?: number;
          user_id: string;
        };
        Update: {
          cached_input_tokens?: number;
          context_size?: number;
          conversation_id?: string;
          cost?: number;
          cpu?: number;
          created_at?: string;
          credits_cap?: number;
          credits_used?: number;
          gpu?: number;
          id?: string;
          input_tokens?: number;
          memory?: number;
          model?: string;
          network?: number;
          organization_id?: string;
          output_tokens?: number;
          project_id?: string;
          reasoning_tokens?: number;
          storage?: number;
          total_tokens?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'usage_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'usage_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'usage_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'usage_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      user_preferences: {
        Row: {
          created_at: string | null;
          preferences: Json;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          preferences?: Json;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          preferences?: Json;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      user_quotas: {
        Row: {
          created_at: string;
          credits_allocated: number;
          credits_remaining: number | null;
          credits_used: number;
          id: string;
          is_active: boolean | null;
          organization_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          credits_allocated?: number;
          credits_remaining?: number | null;
          credits_used?: number;
          id?: string;
          is_active?: boolean | null;
          organization_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          credits_allocated?: number;
          credits_remaining?: number | null;
          credits_used?: number;
          id?: string;
          is_active?: boolean | null;
          organization_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_quotas_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_quotas_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      user_tokens: {
        Row: {
          account_id: string;
          created_at: string | null;
          created_by: string | null;
          expires_at: number;
          id: string;
          revoked: boolean | null;
          revoked_at: string | null;
          scopes: Json;
          token_name: string;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          account_id: string;
          created_at?: string | null;
          created_by?: string | null;
          expires_at: number;
          id?: string;
          revoked?: boolean | null;
          revoked_at?: string | null;
          scopes: Json;
          token_name: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          account_id?: string;
          created_at?: string | null;
          created_by?: string | null;
          expires_at?: number;
          id?: string;
          revoked?: boolean | null;
          revoked_at?: string | null;
          scopes?: Json;
          token_name?: string;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_tokens_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_tokens_account_id_fkey';
            columns: ['account_id'];
            isOneToOne: false;
            referencedRelation: 'user_account_workspace';
            referencedColumns: ['id'];
          },
        ];
      };
      volume_pricing_tiers: {
        Row: {
          created_at: string;
          credits_multiplier: number;
          description: string | null;
          id: string;
          is_active: boolean | null;
          max_amount_cents: number | null;
          min_amount_cents: number;
          priority: number | null;
          tier_name: string | null;
        };
        Insert: {
          created_at?: string;
          credits_multiplier?: number;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_amount_cents?: number | null;
          min_amount_cents: number;
          priority?: number | null;
          tier_name?: string | null;
        };
        Update: {
          created_at?: string;
          credits_multiplier?: number;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          max_amount_cents?: number | null;
          min_amount_cents?: number;
          priority?: number | null;
          tier_name?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      pool_view: {
        Row: {
          avg_cpu_util_pct: number | null;
          avg_mem_util_pct: number | null;
          health_critical_count: number | null;
          health_degraded_count: number | null;
          health_healthy_count: number | null;
          health_unknown_count: number | null;
          id: string | null;
          lifecycle_active_count: number | null;
          lifecycle_provisioning_count: number | null;
          lifecycle_stopped_count: number | null;
          lifecycle_stopping_count: number | null;
          lifecycle_terminated_count: number | null;
          lifecycle_terminating_count: number | null;
          name: string | null;
          node_count: number | null;
          organization_id: string | null;
          provider: string | null;
          region: string | null;
          total_cpu: number | null;
          total_memory_gb: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'node_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'node_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'user_accounts';
            referencedColumns: ['id'];
          },
        ];
      };
      user_account_workspace: {
        Row: {
          id: string | null;
          name: string | null;
          picture_url: string | null;
          subscription_status:
            | Database['public']['Enums']['subscription_status']
            | null;
        };
        Relationships: [];
      };
      user_accounts: {
        Row: {
          id: string | null;
          name: string | null;
          picture_url: string | null;
          role: string | null;
          slug: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_memberships_account_role_fkey';
            columns: ['role'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['name'];
          },
        ];
      };
    };
    Functions: {
      accept_invitation: {
        Args: { token: string; user_id: string };
        Returns: string;
      };
      add_credits_to_organization: {
        Args: {
          credits_amount: number;
          description?: string;
          order_id?: string;
          target_organization_id: string;
        };
        Returns: {
          balance_after: number;
          balance_before: number;
          consumption_amount: number | null;
          consumption_type: string | null;
          created_at: string;
          created_by: string | null;
          credits_amount: number;
          description: string | null;
          id: string;
          metadata: Json | null;
          order_id: string | null;
          organization_id: string;
          project_id: string | null;
          transaction_type: string;
          usage_id: string | null;
          user_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'credits_transactions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      add_invitations_to_organization: {
        Args: {
          invitations: Database['public']['CompositeTypes']['invitation'][];
          org_slug: string;
        };
        Returns: Database['public']['Tables']['invitations']['Row'][];
      };
      allocate_credits_quota: {
        Args: {
          credits_amount: number;
          description?: string;
          target_organization_id: string;
          target_project_id?: string;
          target_user_id?: string;
        };
        Returns: {
          balance_after: number;
          balance_before: number;
          consumption_amount: number | null;
          consumption_type: string | null;
          created_at: string;
          created_by: string | null;
          credits_amount: number;
          description: string | null;
          id: string;
          metadata: Json | null;
          order_id: string | null;
          organization_id: string;
          project_id: string | null;
          transaction_type: string;
          usage_id: string | null;
          user_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'credits_transactions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      calculate_credits_from_amount: {
        Args: { amount_cents: number };
        Returns: number;
      };
      can_action_organization_member: {
        Args: { target_organization_id: string; target_user_id: string };
        Returns: boolean;
      };
      cleanup_expired_nonces: {
        Args: {
          p_include_revoked?: boolean;
          p_include_used?: boolean;
          p_older_than_days?: number;
        };
        Returns: number;
      };
      consume_credits: {
        Args: {
          consumption_amount: number;
          consumption_type: string;
          credits_amount: number;
          description?: string;
          target_organization_id: string;
          target_project_id: string;
          target_user_id: string;
          usage_id: string;
        };
        Returns: {
          balance_after: number;
          balance_before: number;
          consumption_amount: number | null;
          consumption_type: string | null;
          created_at: string;
          created_by: string | null;
          credits_amount: number;
          description: string | null;
          id: string;
          metadata: Json | null;
          order_id: string | null;
          organization_id: string;
          project_id: string | null;
          transaction_type: string;
          usage_id: string | null;
          user_id: string | null;
        };
        SetofOptions: {
          from: '*';
          to: 'credits_transactions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_invitation: {
        Args: { email: string; organization_id: string; role: string };
        Returns: {
          created_at: string;
          email: string;
          expires_at: string;
          id: number;
          invite_token: string;
          invited_by: string;
          organization_id: string;
          role: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'invitations';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_nonce: {
        Args: {
          p_expires_in_seconds?: number;
          p_metadata?: Json;
          p_purpose?: string;
          p_revoke_previous?: boolean;
          p_scopes?: string[];
          p_user_id?: string;
        };
        Returns: Json;
      };
      generate_profile_key: { Args: never; Returns: string };
      generate_random_port: { Args: never; Returns: number };
      get_config: { Args: never; Returns: Json };
      get_nonce_status: { Args: { p_id: string }; Returns: Json };
      get_organization_invitations: {
        Args: { org_slug: string };
        Returns: {
          created_at: string;
          email: string;
          expires_at: string;
          id: number;
          invited_by: string;
          inviter_email: string;
          inviter_name: string;
          organization_id: string;
          role: string;
          updated_at: string;
        }[];
      };
      get_organization_members: {
        Args: { org_slug: string };
        Returns: {
          created_at: string;
          email: string;
          id: string;
          name: string;
          organization_id: string;
          organization_user_id: string;
          picture_url: string;
          role: string;
          role_hierarchy_level: number;
          updated_at: string;
          user_id: string;
        }[];
      };
      get_storage_filename_as_uuid: { Args: { name: string }; Returns: string };
      get_upper_system_role: { Args: never; Returns: string };
      has_active_subscription: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      has_more_elevated_role: {
        Args: {
          role_name: string;
          target_account_id: string;
          target_user_id: string;
        };
        Returns: boolean;
      };
      has_permission: {
        Args: {
          organization_id: string;
          permission_name: Database['public']['Enums']['app_permissions'];
          user_id: string;
        };
        Returns: boolean;
      };
      has_role_on_organization: {
        Args: { account_role?: string; organization_id: string };
        Returns: boolean;
      };
      has_same_role_hierarchy_level: {
        Args: {
          role_name: string;
          target_account_id: string;
          target_user_id: string;
        };
        Returns: boolean;
      };
      has_valid_invitation_for_organization: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      is_aal2: { Args: never; Returns: boolean };
      is_account_owner: { Args: { account_id: string }; Returns: boolean };
      is_conversation_owner: {
        Args: { target_conversation_id: string };
        Returns: boolean;
      };
      is_mfa_compliant: { Args: never; Returns: boolean };
      is_notebook_owner: {
        Args: { target_notebook_id: string };
        Returns: boolean;
      };
      is_organization_member: {
        Args: { organization_id: string; user_id: string };
        Returns: boolean;
      };
      is_organization_owner: {
        Args: { organization_id: string };
        Returns: boolean;
      };
      is_set: { Args: { field_name: string }; Returns: boolean };
      is_super_admin: { Args: never; Returns: boolean };
      merge_user_preferences: {
        Args: { p_patch: Json };
        Returns: {
          created_at: string | null;
          preferences: Json;
          updated_at: string | null;
          user_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'user_preferences';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      organization_workspace: {
        Args: { org_slug: string };
        Returns: {
          id: string;
          name: string;
          permissions: Database['public']['Enums']['app_permissions'][];
          picture_url: string;
          role: string;
          role_hierarchy_level: number;
          slug: string;
          subscription_status: Database['public']['Enums']['subscription_status'];
          user_id: string;
        }[];
      };
      remix_conversation: {
        Args: { source_conversation_id: string; target_project_id: string };
        Returns: string;
      };
      remix_datasource: {
        Args: { source_datasource_id: string; target_project_id: string };
        Returns: string;
      };
      remix_notebook: {
        Args: { source_notebook_id: string; target_project_id: string };
        Returns: string;
      };
      revoke_nonce: {
        Args: { p_id: string; p_reason?: string };
        Returns: boolean;
      };
      share_organization_with_user: {
        Args: { account_owner_user_id: string };
        Returns: boolean;
      };
      shorten_id: { Args: { input_id: string }; Returns: string };
      slugify: { Args: { value: string }; Returns: string };
      transfer_organization_ownership: {
        Args: { new_owner_id: string; target_organization_id: string };
        Returns: undefined;
      };
      unaccent: { Args: { '': string }; Returns: string };
      upsert_order: {
        Args: {
          billing_provider: Database['public']['Enums']['billing_provider'];
          currency: string;
          line_items: Json;
          status: Database['public']['Enums']['payment_status'];
          target_customer_id: string;
          target_order_id: string;
          target_organization_id: string;
          total_amount: number;
        };
        Returns: {
          billing_provider: Database['public']['Enums']['billing_provider'];
          created_at: string;
          currency: string;
          customer_id: string;
          id: string;
          organization_id: string;
          status: Database['public']['Enums']['payment_status'];
          total_amount: number;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      upsert_subscription: {
        Args: {
          active: boolean;
          billing_provider: Database['public']['Enums']['billing_provider'];
          cancel_at_period_end: boolean;
          currency: string;
          line_items: Json;
          period_ends_at: string;
          period_starts_at: string;
          status: Database['public']['Enums']['subscription_status'];
          target_customer_id: string;
          target_organization_id: string;
          target_subscription_id: string;
          trial_ends_at?: string;
          trial_starts_at?: string;
        };
        Returns: {
          active: boolean;
          billing_provider: Database['public']['Enums']['billing_provider'];
          cancel_at_period_end: boolean;
          created_at: string;
          currency: string;
          customer_id: string;
          id: string;
          organization_id: string;
          period_ends_at: string;
          period_starts_at: string;
          status: Database['public']['Enums']['subscription_status'];
          trial_ends_at: string | null;
          trial_starts_at: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'subscriptions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      verify_nonce: {
        Args: {
          p_ip?: unknown;
          p_max_verification_attempts?: number;
          p_purpose: string;
          p_required_scopes?: string[];
          p_token: string;
          p_user_agent?: string;
          p_user_id?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_permissions:
        | 'roles.manage'
        | 'billing.manage'
        | 'settings.manage'
        | 'members.manage'
        | 'invites.manage'
        | 'projects.manage'
        | 'datasources.manage'
        | 'datasources.publish'
        | 'notebooks.manage'
        | 'notebooks.share'
        | 'notebooks.publish'
        | 'conversations.manage'
        | 'conversations.share'
        | 'conversations.publish'
        | 'messages.manage'
        | 'usage.view'
        | 'integrations.manage';
      billing_provider: 'stripe';
      compute_status: 'INIT' | 'PENDING' | 'RUNNING' | 'STOPPED' | 'ERROR';
      hosting_provider:
        | 'AWS'
        | 'Azure'
        | 'GCP'
        | 'DigitalOcean'
        | 'Linode'
        | 'Vultr'
        | 'Other'
        | 'On-premise';
      job_status:
        | 'INIT'
        | 'PENDING'
        | 'IN_PROGRESS'
        | 'CREATED'
        | 'ERROR'
        | 'DELETED';
      node_eligibility_state: 'eligible' | 'ineligible';
      node_health: 'healthy' | 'warning' | 'critical' | 'offline' | 'unknown';
      node_lifecycle_state:
        | 'provisioning'
        | 'active'
        | 'stopping'
        | 'stopped'
        | 'terminating'
        | 'terminated';
      node_orchestration_state:
        | 'unknown'
        | 'initializing'
        | 'ready'
        | 'down'
        | 'disconnected';
      node_status: 'Up' | 'Down';
      node_type: 'private' | 'public';
      notification_channel: 'in_app' | 'email';
      notification_type: 'info' | 'warning' | 'error';
      payment_status: 'pending' | 'succeeded' | 'failed';
      subscription_item_type: 'flat' | 'per_seat' | 'metered';
      subscription_status:
        | 'active'
        | 'trialing'
        | 'past_due'
        | 'canceled'
        | 'unpaid'
        | 'incomplete'
        | 'incomplete_expired'
        | 'paused';
    };
    CompositeTypes: {
      invitation: {
        email: string | null;
        role: string | null;
      };
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Relationships: [];
      };
      iceberg_namespaces: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'iceberg_namespaces_catalog_id_fkey';
            columns: ['catalog_id'];
            isOneToOne: false;
            referencedRelation: 'buckets_analytics';
            referencedColumns: ['id'];
          },
        ];
      };
      iceberg_tables: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id: string | null;
          shard_id: string | null;
          shard_key: string | null;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          namespace_id?: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'iceberg_tables_catalog_id_fkey';
            columns: ['catalog_id'];
            isOneToOne: false;
            referencedRelation: 'buckets_analytics';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'iceberg_tables_namespace_id_fkey';
            columns: ['namespace_id'];
            isOneToOne: false;
            referencedRelation: 'iceberg_namespaces';
            referencedColumns: ['id'];
          },
        ];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'objects_bucketId_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          metadata: Json | null;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 's3_multipart_uploads';
            referencedColumns: ['id'];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'vector_indexes_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets_vectors';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] };
        Returns: boolean;
      };
      allow_only_operation: {
        Args: { expected_operation: string };
        Returns: boolean;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string };
        Returns: string;
      };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_by_timestamp: {
        Args: {
          p_bucket_id: string;
          p_level: number;
          p_limit: number;
          p_prefix: string;
          p_sort_column: string;
          p_sort_column_after: string;
          p_sort_order: string;
          p_start_after: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: 'STANDARD' | 'ANALYTICS' | 'VECTOR';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_permissions: [
        'roles.manage',
        'billing.manage',
        'settings.manage',
        'members.manage',
        'invites.manage',
        'projects.manage',
        'datasources.manage',
        'datasources.publish',
        'notebooks.manage',
        'notebooks.share',
        'notebooks.publish',
        'conversations.manage',
        'conversations.share',
        'conversations.publish',
        'messages.manage',
        'usage.view',
        'integrations.manage',
      ],
      billing_provider: ['stripe'],
      compute_status: ['INIT', 'PENDING', 'RUNNING', 'STOPPED', 'ERROR'],
      hosting_provider: [
        'AWS',
        'Azure',
        'GCP',
        'DigitalOcean',
        'Linode',
        'Vultr',
        'Other',
        'On-premise',
      ],
      job_status: [
        'INIT',
        'PENDING',
        'IN_PROGRESS',
        'CREATED',
        'ERROR',
        'DELETED',
      ],
      node_eligibility_state: ['eligible', 'ineligible'],
      node_health: ['healthy', 'warning', 'critical', 'offline', 'unknown'],
      node_lifecycle_state: [
        'provisioning',
        'active',
        'stopping',
        'stopped',
        'terminating',
        'terminated',
      ],
      node_orchestration_state: [
        'unknown',
        'initializing',
        'ready',
        'down',
        'disconnected',
      ],
      node_status: ['Up', 'Down'],
      node_type: ['private', 'public'],
      notification_channel: ['in_app', 'email'],
      notification_type: ['info', 'warning', 'error'],
      payment_status: ['pending', 'succeeded', 'failed'],
      subscription_item_type: ['flat', 'per_seat', 'metered'],
      subscription_status: [
        'active',
        'trialing',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete',
        'incomplete_expired',
        'paused',
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ['STANDARD', 'ANALYTICS', 'VECTOR'],
    },
  },
} as const;
