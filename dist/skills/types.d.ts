export interface SkillMetadata {
    name: string;
    description: string;
    userInvocable: boolean;
}
export interface Skill {
    metadata: SkillMetadata;
    content: string;
}
