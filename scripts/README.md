# Scripts Folder

This folder contains all the automation scripts for the Order Management System.

## 📁 Available Scripts

### Setup Scripts
- **`setup.bat`** - Complete project setup (dependencies + optional database)
- **`setup.ps1`** - PowerShell version of setup script

### Development Scripts  
- **`start-dev.bat`** - Start frontend and backend in separate CMD windows
- **`start-dev.ps1`** - PowerShell version that starts services in separate windows

### Demo Scripts
- **`demo_script.bat`** - Automated Event Sourcing demonstration using curl
- **`demo_script.ps1`** - PowerShell version of demo script

### Database Scripts
- **`database-setup.bat`** - PostgreSQL database and schema setup only

## 🚀 Usage

**From project root:**
```batch
cd scripts
setup.bat
start-dev.bat
```

**Or use the convenient launcher:**
```batch
quick-start.bat
```

## 📝 Notes

- All scripts are designed to work from the `scripts/` directory
- Batch scripts work with standard Windows CMD
- PowerShell scripts require PowerShell execution policy to allow script execution
- Database setup requires PostgreSQL to be installed and running
