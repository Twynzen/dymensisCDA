import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./modules/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'home',
    loadComponent: () => import('./modules/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./modules/auth/feature-login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'shared/:id',
    loadComponent: () => import('./modules/shared-view/shared-view.component').then(m => m.SharedViewComponent)
  },
  {
    path: 'tabs',
    loadComponent: () => import('./layout/tabs/tabs.component').then(m => m.TabsComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'characters',
        children: [
          {
            path: '',
            loadComponent: () => import('./modules/characters/feature-list/character-list.component').then(m => m.CharacterListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./modules/characters/feature-editor/character-editor.component').then(m => m.CharacterEditorComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./modules/characters/feature-detail/character-detail.component').then(m => m.CharacterDetailComponent)
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./modules/characters/feature-editor/character-editor.component').then(m => m.CharacterEditorComponent)
          },
          {
            path: ':id/share',
            loadComponent: () => import('./modules/characters/feature-share/character-share.component').then(m => m.CharacterShareComponent)
          }
        ]
      },
      {
        path: 'universes',
        children: [
          {
            path: '',
            loadComponent: () => import('./modules/universes/feature-list/universe-list.component').then(m => m.UniverseListComponent)
          },
          {
            path: 'new',
            loadComponent: () => import('./modules/universes/feature-editor/universe-editor.component').then(m => m.UniverseEditorComponent)
          },
          {
            path: ':id',
            loadComponent: () => import('./modules/universes/feature-detail/universe-detail.component').then(m => m.UniverseDetailComponent)
          },
          {
            path: ':id/edit',
            loadComponent: () => import('./modules/universes/feature-editor/universe-editor.component').then(m => m.UniverseEditorComponent)
          }
        ]
      },
      {
        path: 'creation',
        loadComponent: () => import('./modules/creation/feature-creation-hub/creation-hub.component').then(m => m.CreationHubComponent)
      },
      {
        path: '',
        redirectTo: 'characters',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
