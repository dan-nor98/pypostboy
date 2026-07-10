import './styles/index.css';
import { renderAppPage } from './pages/AppPage.js';
import { initWorkspaceController } from './pages/workspaceController.js';

document.querySelector('#root').innerHTML = renderAppPage();
initWorkspaceController();
