import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { Login } from './features/auth/login/login';
import { Signup } from './features/auth/signup/signup';
import { ChatPage } from './features/chat/pages/chat-page/chat-page';
import { Profile } from './features/profile/profile';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'chat',
  },
  {
    path: 'login',
    component: Login,
    canActivate: [guestGuard],
  },
  {
    path: 'signup',
    component: Signup,
    canActivate: [guestGuard],
  },
  {
    path: 'chat',
    component: ChatPage,
    canActivate: [authGuard],
  },
  {
    path: 'chat/:conversationId',
    component: ChatPage,
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    component: Profile,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'chat',
  },
];
