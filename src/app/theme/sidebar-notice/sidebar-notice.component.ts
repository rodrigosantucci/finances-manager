import { Component, ViewEncapsulation } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-sidebar-notice',
  templateUrl: './sidebar-notice.component.html',
  styleUrl: './sidebar-notice.component.scss',
  host: {
    class: 'matero-sidebar-notice',
  },
  encapsulation: ViewEncapsulation.None,
  imports: [MatTabsModule],
})
export class SidebarNoticeComponent {
  tabs = [
    {
      label: 'Notifications',
      messages: [
        {
          icon: '📩',
          color: 'bg-magenta-95',
          title: 'Weekly reports are available',
          content: `Please go to the notification center to check your reports.`,
        },
      ],
    },
  ];
}
