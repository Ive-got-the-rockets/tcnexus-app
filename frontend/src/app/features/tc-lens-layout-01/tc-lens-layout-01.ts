import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { buildTcLensUrl } from '../lesson-player/tc-lens-url';

@Component({
  selector: 'app-tc-lens-layout-01',
  templateUrl: './tc-lens-layout-01.html',
  styleUrl: './tc-lens-layout-01.scss'
})
export class TcLensLayout01Page {
  protected readonly tcLensUrl: SafeResourceUrl;

  constructor(sanitizer: DomSanitizer) {
    this.tcLensUrl = sanitizer.bypassSecurityTrustResourceUrl(
      buildTcLensUrl('https://app.tradecheetah.com', 123)
    );
  }
}
