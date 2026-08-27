import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { VisitorService } from '../../core/visitor.service';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfilePage {
  protected readonly visitor = inject(VisitorService);
}
