!macro customUnInstall
  IfFileExists "$APPDATA\EduSchedule\*.*" 0 +3
    MessageBox MB_YESNO|MB_ICONQUESTION "¿Deseas eliminar también la base de datos y los datos guardados del colegio de EduSchedule?" IDNO +2
    RMDir /r "$APPDATA\EduSchedule"
!macroend
