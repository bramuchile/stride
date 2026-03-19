use serde::Serialize;
use std::cmp::Ordering;
use std::sync::Mutex;
use sysinfo::{Components, Disks, System};
use tauri::State;

pub struct SysinfoState {
    pub system: Mutex<System>,
    pub disks: Mutex<Disks>,
    pub components: Mutex<Components>,
}

impl SysinfoState {
    pub fn new() -> Self {
        Self {
            system: Mutex::new(System::new_all()),
            disks: Mutex::new(Disks::new_with_refreshed_list()),
            components: Mutex::new(Components::new_with_refreshed_list()),
        }
    }
}

#[derive(Serialize)]
pub struct CpuCore {
    pub index: usize,
    pub usage: f32,
    pub frequency: u64,
}

#[derive(Serialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount: String,
    pub used: u64,
    pub total: u64,
}

#[derive(Serialize)]
pub struct TempInfo {
    pub label: String,
    pub temp_celsius: f32,
}

#[derive(Serialize)]
pub struct SystemStats {
    pub cpu_usage_total: f32,
    pub cpu_cores: Vec<CpuCore>,
    pub cpu_brand: String,
    pub ram_used: u64,
    pub ram_total: u64,
    pub swap_used: u64,
    pub swap_total: u64,
    pub disks: Vec<DiskInfo>,
    pub temperatures: Vec<TempInfo>,
    pub uptime_secs: u64,
    pub os_name: String,
}

#[derive(Serialize)]
pub struct ProcessInfo {
    pub name: String,
    pub cpu_usage: f32,
    pub memory: u64,
    pub pid: u32,
}

#[tauri::command]
pub fn get_system_stats(state: State<'_, SysinfoState>) -> SystemStats {
    let mut system = state.system.lock().unwrap();
    system.refresh_cpu();
    system.refresh_memory();

    let cpu_cores = system
        .cpus()
        .iter()
        .enumerate()
        .map(|(index, cpu)| CpuCore {
            index,
            usage: cpu.cpu_usage(),
            frequency: cpu.frequency(),
        })
        .collect::<Vec<_>>();

    let cpu_usage_total = system.global_cpu_info().cpu_usage();
    let cpu_brand = system
        .cpus()
        .first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_default();

    let ram_used = system.used_memory();
    let ram_total = system.total_memory();
    let swap_used = system.used_swap();
    let swap_total = system.total_swap();
    let uptime_secs = System::uptime();
    let os_name = System::long_os_version().unwrap_or_default();

    drop(system);

    let mut disks_state = state.disks.lock().unwrap();
    disks_state.refresh_list();
    disks_state.refresh();
    let disks = disks_state
        .iter()
        .map(|disk| DiskInfo {
            name: disk.name().to_string_lossy().to_string(),
            mount: disk.mount_point().to_string_lossy().to_string(),
            used: disk.total_space().saturating_sub(disk.available_space()),
            total: disk.total_space(),
        })
        .collect::<Vec<_>>();

    drop(disks_state);

    let mut components_state = state.components.lock().unwrap();
    components_state.refresh_list();
    components_state.refresh();
    let temperatures = components_state
        .iter()
        .map(|component| TempInfo {
            label: component.label().to_string(),
            temp_celsius: component.temperature(),
        })
        .collect::<Vec<_>>();

    SystemStats {
        cpu_usage_total,
        cpu_cores,
        cpu_brand,
        ram_used,
        ram_total,
        swap_used,
        swap_total,
        disks,
        temperatures,
        uptime_secs,
        os_name,
    }
}

#[tauri::command]
pub fn get_top_processes(
    state: State<'_, SysinfoState>,
    sort_by: String,
    limit: usize,
) -> Vec<ProcessInfo> {
    let mut system = state.system.lock().unwrap();
    system.refresh_processes();

    let mut processes = system
        .processes()
        .values()
        .map(|process| ProcessInfo {
            name: process.name().to_string(),
            cpu_usage: process.cpu_usage(),
            memory: process.memory(),
            pid: process.pid().as_u32(),
        })
        .collect::<Vec<_>>();

    if sort_by == "memory" {
        processes.sort_by(|a, b| b.memory.cmp(&a.memory));
    } else {
        processes.sort_by(|a, b| {
            b.cpu_usage
                .partial_cmp(&a.cpu_usage)
                .unwrap_or(Ordering::Equal)
        });
    }

    processes.truncate(limit);
    processes
}
